import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const month    = parseInt(searchParams.get("month") ?? "0");
  const year     = parseInt(searchParams.get("year")  ?? "0");

  if (!memberId || !month || !year)
    return NextResponse.json({ error: "memberId, month, year required" }, { status: 400 });

  // Get all commission records for this member this month (exclude BI — handled separately)
  const records = await prisma.commissionRecord.findMany({
    where: { memberId, month, year },
    select: {
      type: true, amount: true, depth: true, saleId: true,
      fromMember: { select: { name: true, memberId: true } },
      sale: {
        select: {
          amount: true, deletedAt: true,
          saleItems: { include: { product: { select: { name: true, mrp: true } } } },
        },
      },
    },
    orderBy: [{ type: "asc" }, { depth: "asc" }],
  });

  // Separate by type
  const business: typeof records = [];
  const pi:       typeof records = [];
  const bi:       typeof records = [];

  for (const r of records) {
    if (r.sale?.deletedAt) continue; // skip deleted sales
    if (r.type === "BUSINESS") business.push(r);
    else if (r.type === "PI")  pi.push(r);
    else if (r.type === "BI")  bi.push(r);
  }

  const fmt = (r: (typeof records)[0]) => ({
    fromName:     r.fromMember?.name ?? "Self",
    fromMemberId: r.fromMember?.memberId ?? "—",
    depth:        r.depth,
    amount:       parseFloat(r.amount.toFixed(2)),
    saleAmount:   r.sale?.amount ?? 0,
    products:     r.sale?.saleItems.map(i => `${i.product?.name ?? "?"} ×${i.quantity}`) ?? [],
  });

  return NextResponse.json({
    business: business.map(fmt),
    pi:       pi.map(fmt),
    bi:       bi.map(fmt),
    totals: {
      business: parseFloat(business.reduce((s, r) => s + r.amount, 0).toFixed(2)),
      pi:       parseFloat(pi.reduce((s, r) => s + r.amount, 0).toFixed(2)),
      bi:       parseFloat(bi.reduce((s, r) => s + r.amount, 0).toFixed(2)),
    },
  });
}
