import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — list released BI payouts, OR preview if ?preview=1 with date range
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const preview   = searchParams.get("preview") === "1";
  const fromMonth = parseInt(searchParams.get("fromMonth") ?? "0");
  const fromYear  = parseInt(searchParams.get("fromYear")  ?? "0");
  const toMonth   = parseInt(searchParams.get("toMonth")   ?? "0");
  const toYear    = parseInt(searchParams.get("toYear")    ?? "0");

  if (preview) {
    if (!fromMonth || !fromYear || !toMonth || !toYear)
      return NextResponse.json({ error: "fromMonth, fromYear, toMonth, toYear required" }, { status: 400 });

    // Collect all months in the range
    const monthRange: { month: number; year: number }[] = [];
    let m = fromMonth, y = fromYear;
    while (y < toYear || (y === toYear && m <= toMonth)) {
      monthRange.push({ month: m, year: y });
      m++;
      if (m > 12) { m = 1; y++; }
      if (monthRange.length > 120) break; // safety cap
    }

    const records = await prisma.commissionRecord.findMany({
      where: { type: "BI", OR: monthRange },
      select: { memberId: true, amount: true, member: { select: { name: true, memberId: true } } },
    });

    const byMember = new Map<string, { name: string; memberIdCode: string; total: number }>();
    for (const r of records) {
      if (!byMember.has(r.memberId))
        byMember.set(r.memberId, { name: r.member.name, memberIdCode: r.member.memberId ?? "", total: 0 });
      byMember.get(r.memberId)!.total += r.amount;
    }

    const members = Array.from(byMember.entries())
      .map(([id, v]) => ({ memberId: id, name: v.name, memberIdCode: v.memberIdCode, total: parseFloat(v.total.toFixed(2)) }))
      .filter((m) => m.total >= 0.01)
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ members });
  }

  // List past BI payouts
  const payouts = await prisma.biPayoutRecord.findMany({
    include: { member: { select: { name: true, memberId: true, rank: true } } },
    orderBy: { paidAt: "desc" },
    take: 100,
  });
  return NextResponse.json(payouts);
}

// POST — release BI payouts for a period
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { period, fromMonth, fromYear, toMonth, toYear, members } = await req.json();
  // members: [{ memberId, amount }]
  if (!period || !fromMonth || !fromYear || !toMonth || !toYear || !Array.isArray(members) || members.length === 0)
    return NextResponse.json({ error: "period, date range, and members required" }, { status: 400 });

  const created = await prisma.biPayoutRecord.createMany({
    data: members.map((m: { memberId: string; amount: number }) => ({
      memberId:  m.memberId,
      period,
      fromMonth: parseInt(fromMonth),
      fromYear:  parseInt(fromYear),
      toMonth:   parseInt(toMonth),
      toYear:    parseInt(toYear),
      amount:    Number(m.amount),
    })),
  });

  return NextResponse.json({ created: created.count }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.biPayoutRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
