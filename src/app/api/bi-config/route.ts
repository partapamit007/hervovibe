import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getOrCreateConfig() {
  const existing = await prisma.biConfig.findFirst();
  if (existing) return existing;
  return prisma.biConfig.create({ data: { baseRate: 1.0 } });
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await getOrCreateConfig();
  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { baseRate } = await req.json();
  if (baseRate === undefined || isNaN(parseFloat(baseRate)) || parseFloat(baseRate) <= 0)
    return NextResponse.json({ error: "Valid base rate required" }, { status: 400 });

  const config = await getOrCreateConfig();
  const updated = await prisma.biConfig.update({
    where: { id: config.id },
    data: { baseRate: parseFloat(baseRate) },
  });
  return NextResponse.json(updated);
}
