import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runRankEngine, getRankHistory, resetAllRanks } from "@/lib/rankEngine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { month, year, reset } = await req.json();
  if (!month || !year)
    return NextResponse.json({ error: "Month and year required" }, { status: 400 });

  if (reset) await resetAllRanks();

  const result = await runRankEngine(parseInt(month), parseInt(year));
  return NextResponse.json({ ...result, wasReset: !!reset });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const history = await getRankHistory(100);
  return NextResponse.json(history);
}
