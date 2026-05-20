import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId, month, year, salaryAmount, piAmount, biAmount, paymentMode, transactionRef, notes } = await req.json();
  if (!memberId || !month || !year)
    return NextResponse.json({ error: "memberId, month, year required" }, { status: 400 });

  const salary = parseFloat(salaryAmount || 0);
  const pi     = parseFloat(piAmount     || 0);
  const bi     = parseFloat(biAmount     || 0);

  const payout = await prisma.payoutRecord.create({
    data: {
      memberId,
      month: parseInt(month),
      year:  parseInt(year),
      salaryAmount: salary,
      piAmount:     pi,
      biAmount:     bi,
      totalAmount:  salary + pi + bi,
      paymentMode:  paymentMode  || null,
      transactionRef: transactionRef || null,
      notes:        notes || null,
    },
    include: { member: { select: { name: true, memberId: true } } },
  });

  return NextResponse.json(payout, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const month    = searchParams.get("month");
  const year     = searchParams.get("year");

  const payouts = await prisma.payoutRecord.findMany({
    where: {
      ...(memberId ? { memberId } : {}),
      ...(month && year ? { month: parseInt(month), year: parseInt(year) } : {}),
    },
    include: {
      member: { select: { name: true, memberId: true, rank: true, bankAccount: true, ifscCode: true, upiId: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json(payouts);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.payoutRecord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
