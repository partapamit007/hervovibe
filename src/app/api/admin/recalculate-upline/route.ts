import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const COMM_BASE = 1260;
  const DEPTH_PCT: Record<number, number> = { 1: 0.04, 2: 0.02, 3: 0.015, 4: 0.01, 5: 0.0075, 6: 0.005, 7: 0.0025 };
  const RANK_MAX_DEPTH: Record<string, number> = {
    DISTRIBUTOR: 0, BRONZE: 1, SILVER: 2, GOLDEN: 3,
    DIAMOND: 4, SUPER_DIAMOND: 5, PLATINUM: 6, CENTENNIAL: 7,
  };

  // Prefetch all users once — walk upline chain in memory (no N+1)
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, rank: true, sponsorId: true },
  });
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const biConfig = await prisma.biConfig.findFirst();
  const globalBiRate = biConfig ? biConfig.baseRate / 100 : 0.01;

  const sales = await prisma.sale.findMany({
    where: { deletedAt: null },
    select: {
      id: true, memberId: true, month: true, year: true, amount: true,
      member: { select: { sponsorId: true } },
      saleItems: {
        include: { product: { select: { piRate: true, piUpline: true, biRate: true, biUpline: true } } },
      },
    },
  });

  const newRecords: {
    memberId: string; saleId: string; fromMemberId: string;
    month: number; year: number; type: "PI" | "BI" | "BUSINESS"; amount: number; depth: number;
  }[] = [];

  for (const sale of sales) {
    const base = { saleId: sale.id, fromMemberId: sale.memberId, month: sale.month, year: sale.year };
    const noItems = sale.saleItems.length === 0;

    // Seller's BUSINESS commission on fixed ₹1,260 base
    newRecords.push({ ...base, memberId: sale.memberId, type: "BUSINESS", amount: COMM_BASE * 0.08, depth: 0 });

    let totalSellerPI = 0, totalSellerBI = 0, totalUplinePI = 0, totalUplineBI = 0;
    for (const item of sale.saleItems) {
      const qty = item.quantity;
      totalSellerPI += qty * (item.product?.piRate   ?? 0);
      totalSellerBI += qty * (item.product?.biRate   ?? 0);
      totalUplinePI += qty * (item.product?.piUpline ?? 0);
      totalUplineBI += qty * (item.product?.biUpline ?? 0);
    }
    if (noItems) totalSellerBI = COMM_BASE * globalBiRate;

    if (totalSellerPI >= 0.01)
      newRecords.push({ ...base, memberId: sale.memberId, type: "PI", amount: parseFloat(totalSellerPI.toFixed(2)), depth: 0 });
    if (totalSellerBI >= 0.01)
      newRecords.push({ ...base, memberId: sale.memberId, type: "BI", amount: parseFloat(totalSellerBI.toFixed(2)), depth: 0 });

    // Walk upline chain in memory
    let curId: string | null = sale.member.sponsorId;
    let depth = 1;
    const visited = new Set<string>();
    while (curId && !visited.has(curId)) {
      visited.add(curId);
      const upline = userMap.get(curId);
      if (!upline) break;

      // PI + BI for every upline level
      if (totalUplinePI >= 0.01) newRecords.push({ ...base, memberId: curId, type: "PI", amount: parseFloat(totalUplinePI.toFixed(2)), depth });
      if (totalUplineBI >= 0.01) newRecords.push({ ...base, memberId: curId, type: "BI", amount: parseFloat(totalUplineBI.toFixed(2)), depth });

      // BUSINESS — rank-gated
      const maxDepth = RANK_MAX_DEPTH[upline.rank] ?? 0;
      if (maxDepth >= depth && DEPTH_PCT[depth]) {
        newRecords.push({ ...base, memberId: curId, type: "BUSINESS", amount: parseFloat((COMM_BASE * DEPTH_PCT[depth]).toFixed(2)), depth });
      }

      curId = upline.sponsorId;
      depth++;
    }
  }

  // Atomic: delete ALL commission records and insert fresh ones
  const [deleted, insertResult] = await prisma.$transaction([
    prisma.commissionRecord.deleteMany({}),
    prisma.commissionRecord.createMany({ data: newRecords, skipDuplicates: true }),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: deleted.count,
    created: insertResult.count,
    salesProcessed: sales.length,
  });
}
