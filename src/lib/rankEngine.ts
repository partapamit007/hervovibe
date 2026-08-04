import { prisma } from "@/lib/prisma";
import { Rank } from "@prisma/client";

const RANK_ORDER: Rank[] = [
  "DISTRIBUTOR", "BRONZE", "SILVER", "GOLDEN",
  "DIAMOND", "SUPER_DIAMOND", "PLATINUM", "CENTENNIAL",
];

const RANK_MIN_TEAM: Record<Rank, number> = {
  DISTRIBUTOR:   0,
  BRONZE:        6,
  SILVER:        36,
  GOLDEN:        216,
  DIAMOND:       1296,
  SUPER_DIAMOND: 7776,
  PLATINUM:      46656,
  CENTENNIAL:    279936,
};

export async function resetAllRanks() {
  await prisma.user.updateMany({
    where: { role: "DISTRIBUTOR", deletedAt: null },
    data: { rank: "DISTRIBUTOR" },
  });
}

export async function runRankEngine(month: number, year: number) {
  const allUsers = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR", deletedAt: null },
    select: { id: true, rank: true, sponsorId: true },
  });

  // Own sales for this month (required minimum: ₹1260 to qualify above DISTRIBUTOR)
  const allSales = await prisma.sale.findMany({
    where: { month, year, deletedAt: null },
    select: { memberId: true, amount: true },
  });
  const salesByMember = new Map<string, number>();
  for (const s of allSales) {
    salesByMember.set(s.memberId, (salesByMember.get(s.memberId) ?? 0) + s.amount);
  }

  // Build parent→children map
  const children = new Map<string, string[]>();
  for (const u of allUsers) {
    if (u.sponsorId) {
      if (!children.has(u.sponsorId)) children.set(u.sponsorId, []);
      children.get(u.sponsorId)!.push(u.id);
    }
  }

  // Count ALL downline (for display/history)
  function countDownline(id: string): number {
    let count = 0;
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
      const cur = queue.shift()!;
      count++;
      queue.push(...(children.get(cur) ?? []));
    }
    return count;
  }

  // Count ALL direct recruits (headcount, any sales including zero).
  function countDirects(id: string): number {
    return (children.get(id) ?? []).length;
  }

  // Sum of sales from ALL direct recruits this month (regardless of individual amounts).
  // BRONZE needs this total ≥ ₹7,560 (6 × ₹1,260) — one person can contribute all of it.
  function sumDirectSales(id: string): number {
    return (children.get(id) ?? []).reduce(
      (total, child) => total + (salesByMember.get(child) ?? 0), 0
    );
  }

  // Count ALL active downline — members anywhere in the tree with ≥₹1,260 own sales.
  // Used for SILVER and above where total team size is what matters.
  function countGreenDownline(id: string): number {
    let count = 0;
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
      const cur = queue.shift()!;
      if ((salesByMember.get(cur) ?? 0) >= 1260) count++;
      queue.push(...(children.get(cur) ?? []));
    }
    return count;
  }

  // Ranks are permanent — once achieved they are never taken away.
  // BRONZE: 6 direct recruits (any) + combined direct sales ≥ ₹7,560 + own ≥ ₹1,260.
  // SILVER+: N green total team members (each ≥ ₹1,260) + own ≥ ₹1,260.
  function calcPromotedRank(userId: string, currentRank: Rank): Rank {
    const ownSales = salesByMember.get(userId) ?? 0;
    if (ownSales < 1260) return currentRank;

    const directCount     = countDirects(userId);
    const directSalesSum  = sumDirectSales(userId);
    const greenTeamSize   = countGreenDownline(userId);
    const currentIdx = RANK_ORDER.indexOf(currentRank);
    let promoted: Rank = currentRank;

    for (let i = currentIdx + 1; i < RANK_ORDER.length; i++) {
      const r = RANK_ORDER[i];
      const qualifies =
        r === "BRONZE"
          ? directCount >= 6 && directSalesSum >= 7560
          : greenTeamSize >= RANK_MIN_TEAM[r];
      if (qualifies) promoted = r;
      else break;
    }
    return promoted;
  }

  // Only collect upgrades — no downgrades ever
  const changes: { memberId: string; oldRank: Rank; newRank: Rank; teamSize: number; directSalesSum: number }[] = [];

  for (const user of allUsers) {
    const teamSize      = countDownline(user.id);
    const directSalesSum = sumDirectSales(user.id);
    const newRank       = calcPromotedRank(user.id, user.rank);
    if (newRank !== user.rank) {
      changes.push({ memberId: user.id, oldRank: user.rank, newRank, teamSize, directSalesSum });
    }
  }

  if (changes.length > 0) {
    await Promise.all(
      changes.map((c) => prisma.user.update({ where: { id: c.memberId }, data: { rank: c.newRank } }))
    );
    await prisma.rankHistory.createMany({
      data: changes.map((c) => ({
        memberId: c.memberId,
        oldRank: c.oldRank,
        newRank: c.newRank,
        month,
        year,
        reason: c.newRank === "BRONZE"
          ? `Promoted: 6 directs joined + direct team sales ₹${c.directSalesSum.toFixed(0)} (≥₹7560) + own ₹1260 met`
          : `Promoted: team of ${c.teamSize} + own ₹1260 met`,
      })),
    });
  }

  return {
    processed: allUsers.length,
    changed: changes.length,
    changes,
  };
}

export async function getRankHistory(limit = 50) {
  return prisma.rankHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { member: { select: { name: true, memberId: true } } },
  });
}

export { RANK_MIN_TEAM, RANK_ORDER };
