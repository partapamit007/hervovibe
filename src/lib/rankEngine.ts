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

  // Count only ACTIVE downline — members with ≥₹1,800 own sales this month.
  // Rank promotion requires this count to meet the minimum, not just headcount.
  function countGreenDownline(id: string): number {
    let count = 0;
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
      const cur = queue.shift()!;
      if ((salesByMember.get(cur) ?? 0) >= 1800) count++;
      queue.push(...(children.get(cur) ?? []));
    }
    return count;
  }

  // Ranks are permanent — once achieved they are never taken away.
  // Promotion requires BOTH: ≥ N active (GREEN, ≥₹1800) team members AND own sales ≥ ₹1800.
  function calcPromotedRank(userId: string, currentRank: Rank, greenTeamSize: number): Rank {
    const ownSales = salesByMember.get(userId) ?? 0;
    const currentIdx = RANK_ORDER.indexOf(currentRank);
    let promoted: Rank = currentRank; // never go below current

    for (let i = currentIdx + 1; i < RANK_ORDER.length; i++) {
      const r = RANK_ORDER[i];
      if (greenTeamSize >= RANK_MIN_TEAM[r] && ownSales >= 1800) {
        promoted = r;
      } else {
        break; // ranks are progressive — if this one fails, higher ones will too
      }
    }
    return promoted;
  }

  // Only collect upgrades — no downgrades ever
  const changes: { memberId: string; oldRank: Rank; newRank: Rank; teamSize: number; greenTeamSize: number }[] = [];

  for (const user of allUsers) {
    const teamSize = countDownline(user.id);
    const greenTeamSize = countGreenDownline(user.id);
    const newRank = calcPromotedRank(user.id, user.rank, greenTeamSize);
    if (newRank !== user.rank) {
      changes.push({ memberId: user.id, oldRank: user.rank, newRank, teamSize, greenTeamSize });
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
        reason: `Promoted: ${c.greenTeamSize} active members (≥₹1800 each) of ${c.teamSize} total + own ₹1800 met`,
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
