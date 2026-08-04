import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Prefetch all users once — used to walk upline chain in memory (no N+1)
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, sponsorId: true },
  });
  const sponsorMap = new Map(allUsers.map((u) => [u.id, u.sponsorId]));

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
    month: number; year: number; type: "PI" | "BI"; amount: number; depth: number;
  }[] = [];

  for (const sale of sales) {
    const base = { saleId: sale.id, fromMemberId: sale.memberId, month: sale.month, year: sale.year };

    let totalSellerPI = 0, totalSellerBI = 0, totalUplinePI = 0, totalUplineBI = 0;
    for (const item of sale.saleItems) {
      const qty = item.quantity;
      totalSellerPI += qty * (item.product?.piRate   ?? 0);
      totalSellerBI += qty * (item.product?.biRate   ?? 0);
      totalUplinePI += qty * (item.product?.piUpline ?? 0);
      totalUplineBI += qty * (item.product?.biUpline ?? 0);
    }

    if (totalSellerPI >= 0.01)
      newRecords.push({ ...base, memberId: sale.memberId, type: "PI", amount: parseFloat(totalSellerPI.toFixed(2)), depth: 0 });
    if (totalSellerBI >= 0.01)
      newRecords.push({ ...base, memberId: sale.memberId, type: "BI", amount: parseFloat(totalSellerBI.toFixed(2)), depth: 0 });

    // Walk upline chain in memory — no DB queries per level
    let curId: string | null = sale.member.sponsorId;
    let depth = 1;
    const visited = new Set<string>();
    while (curId && !visited.has(curId)) {
      visited.add(curId);
      if (totalUplinePI >= 0.01) newRecords.push({ ...base, memberId: curId, type: "PI", amount: parseFloat(totalUplinePI.toFixed(2)), depth });
      if (totalUplineBI >= 0.01) newRecords.push({ ...base, memberId: curId, type: "BI", amount: parseFloat(totalUplineBI.toFixed(2)), depth });
      curId = sponsorMap.get(curId) ?? null;
      depth++;
    }
  }

  // Atomic: delete old records and insert new ones in one transaction
  const [deleted, insertResult] = await prisma.$transaction([
    prisma.commissionRecord.deleteMany({ where: { type: { in: ["PI", "BI"] } } }),
    prisma.commissionRecord.createMany({ data: newRecords }),
  ]);

  return NextResponse.json({
    ok: true,
    deleted: deleted.count,
    created: insertResult.count,
    salesProcessed: sales.length,
  });
}
