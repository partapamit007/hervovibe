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

  const monthInt = parseInt(month);
  const yearInt  = parseInt(year);
  if (monthInt < 1 || monthInt > 12 || yearInt < 2020 || yearInt > 2100)
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });

  const salary = parseFloat(salaryAmount || 0);
  const pi     = parseFloat(piAmount     || 0);
  const bi     = parseFloat(biAmount     || 0);

  try {
    const payout = await prisma.payoutRecord.create({
      data: {
        memberId,
        month: monthInt,
        year:  yearInt,
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
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Payout already exists for this member and month" }, { status: 409 });
    throw e;
  }
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
