import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session ||
    (session.user.role !== "MASTER_ADMIN" &&
      session.user.role !== "TEAM_MEMBER")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { memberId, amount, month, year } = await req.json();
  if (!memberId || !amount || !month || !year) {
    return NextResponse.json(
      { error: "All fields required" },
      { status: 400 }
    );
  }
  const sale = await prisma.sale.create({
    data: {
      memberId,
      enteredById: session.user.id,
      amount: parseInt(amount),
      month: parseInt(month),
      year: parseInt(year),
    },
  });
  return NextResponse.json(sale, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const enteredById = searchParams.get("enteredById");

  const sales = await prisma.sale.findMany({
    where: {
      ...(month && year
        ? { month: parseInt(month), year: parseInt(year) }
        : {}),
      ...(enteredById === "me"
        ? { enteredById: session.user.id }
        : enteredById
        ? { enteredById }
        : {}),
    },
    include: {
      member: { select: { name: true, memberId: true, rank: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(sales);
}
