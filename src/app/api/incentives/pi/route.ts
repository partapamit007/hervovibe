import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId, amount, month, year, notes } = await req.json();
  if (!memberId || !amount || !month || !year)
    return NextResponse.json({ error: "All fields required" }, { status: 400 });

  const entry = await prisma.pIEntry.create({
    data: {
      memberId,
      amount: parseFloat(amount),
      month: parseInt(month),
      year: parseInt(year),
      notes: notes || null,
    },
    include: { member: { select: { name: true, memberId: true } } },
  });
  return NextResponse.json(entry, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const memberId = searchParams.get("memberId");

  const entries = await prisma.pIEntry.findMany({
    where: {
      ...(month && year ? { month: parseInt(month), year: parseInt(year) } : {}),
      ...(memberId ? { memberId } : {}),
    },
    include: { member: { select: { name: true, memberId: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.pIEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
