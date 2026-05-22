import { prisma } from "@/lib/prisma";
import { Rank } from "@prisma/client";

const RANK_ORDER: Rank[] = [
  "DISTRIBUTOR", "BRONZE", "SILVER", "GOLDEN",
  "DIAMOND", "SUPER_DIAMOND", "PLATINUM", "CENTENNIAL",
];

const RANK_MIN_TEAM: Record<Rank, number> = {
  DISTRIBUTOR:   0,
  BRONZE:        5,
  SILVER:        25,
  GOLDEN:        125,
  DIAMOND:       625,
  SUPER_DIAMOND: 3125,
  PLATINUM:      15625,
  CENTENNIAL:    78125,
};

export async function runRankEngine(month: number, year: number) {
  const allUsers = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR", deletedAt: null },
    select: { id: true, rank: true, sponsorId: true },
  });

  // Own sales for this month (required minimum: ₹1800 to qualify above DISTRIBUTOR)
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

  // Ranks are permanent — once achieved they are never taken away.
  // Promotion requires BOTH: team size ≥ next rank minimum AND own sales ≥ ₹1800 this month.
  function calcPromotedRank(userId: string, currentRank: Rank, teamSize: number): Rank {
    const ownSales = salesByMember.get(userId) ?? 0;
    const currentIdx = RANK_ORDER.indexOf(currentRank);
    let promoted: Rank = currentRank; // never go below current

    for (let i = currentIdx + 1; i < RANK_ORDER.length; i++) {
      const r = RANK_ORDER[i];
      if (teamSize >= RANK_MIN_TEAM[r] && ownSales >= 1800) {
        promoted = r;
      } else {
        break; // ranks are progressive — if this one fails, higher ones will too
      }
    }
    return promoted;
  }

  // Only collect upgrades — no downgrades ever
  const changes: { memberId: string; oldRank: Rank; newRank: Rank; teamSize: number }[] = [];

  for (const user of allUsers) {
    const teamSize = countDownline(user.id);
    const newRank = calcPromotedRank(user.id, user.rank, teamSize);
    if (newRank !== user.rank) {
      changes.push({ memberId: user.id, oldRank: user.rank, newRank, teamSize });
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
        reason: `Promoted: team size ${c.teamSize} + ₹1800 sales met`,
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
