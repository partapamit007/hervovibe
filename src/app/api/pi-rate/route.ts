import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  if (month && year) {
    const rate = await prisma.piRate.findUnique({
      where: { month_year: { month: parseInt(month), year: parseInt(year) } },
    });
    return NextResponse.json(rate ?? null);
  }

  const rates = await prisma.piRate.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }], take: 24 });
  return NextResponse.json(rates);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { month, year, ratePerPoint } = await req.json();
  if (!month || !year || !ratePerPoint)
    return NextResponse.json({ error: "Month, year and rate required" }, { status: 400 });

  const rate = await prisma.piRate.upsert({
    where: { month_year: { month: parseInt(month), year: parseInt(year) } },
    create: { month: parseInt(month), year: parseInt(year), ratePerPoint: parseFloat(ratePerPoint) },
    update: { ratePerPoint: parseFloat(ratePerPoint) },
  });
  return NextResponse.json(rate);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.piRate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
