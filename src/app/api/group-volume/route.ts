import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Recursively collect all downline IDs using BFS
async function getAllDownlineIds(memberId: string): Promise<string[]> {
  const ids: string[] = [];
  const queue = [memberId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = await prisma.user.findMany({
      where: { sponsorId: current, deletedAt: null },
      select: { id: true },
    });
    for (const c of children) {
      ids.push(c.id);
      queue.push(c.id);
    }
  }
  return ids;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month    = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
  const year     = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
  const memberId = searchParams.get("memberId") || session.user.id;

  // Only admin can query other members; members can only query themselves
  if (memberId !== session.user.id && session.user.role === "DISTRIBUTOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [personalSales, downlineIds] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { amount: true },
      where: { memberId, month, year, deletedAt: null },
    }),
    getAllDownlineIds(memberId),
  ]);

  const groupSales = downlineIds.length > 0
    ? await prisma.sale.aggregate({
        _sum: { amount: true },
        where: { memberId: { in: downlineIds }, month, year, deletedAt: null },
      })
    : { _sum: { amount: 0 } };

  const personal    = personalSales._sum.amount  || 0;
  const downline    = groupSales._sum.amount      || 0;
  const groupVolume = personal + downline;

  return NextResponse.json({
    month, year, memberId,
    personalSales: personal,
    downlineSales: downline,
    groupVolume,
    downlineCount: downlineIds.length,
  });
}
