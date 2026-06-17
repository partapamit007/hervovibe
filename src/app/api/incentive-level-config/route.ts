import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET — returns all incentive level configs
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configs = await prisma.incentiveLevelConfig.findMany({
    orderBy: [{ type: "asc" }, { level: "asc" }],
  });
  return NextResponse.json(configs);
}

// POST — upsert a single level config
// body: { type: "PI" | "BI", level: 1-8, pct: number }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, level, pct } = await req.json();

  if (!["PI", "BI"].includes(type))
    return NextResponse.json({ error: "type must be PI or BI" }, { status: 400 });
  const lvl = parseInt(level);
  if (isNaN(lvl) || lvl < 1 || lvl > 8)
    return NextResponse.json({ error: "level must be 1–8" }, { status: 400 });
  const pctNum = parseFloat(pct);
  if (isNaN(pctNum) || pctNum < 0 || pctNum > 100)
    return NextResponse.json({ error: "pct must be 0–100" }, { status: 400 });

  const config = await prisma.incentiveLevelConfig.upsert({
    where: { type_level: { type, level: lvl } },
    update: { pct: pctNum },
    create: { type, level: lvl, pct: pctNum },
  });
  return NextResponse.json(config);
}

// DELETE — remove a level config (level reverts to equal-split fallback)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, level } = await req.json();
  await prisma.incentiveLevelConfig.deleteMany({ where: { type, level: parseInt(level) } });
  return NextResponse.json({ ok: true });
}
