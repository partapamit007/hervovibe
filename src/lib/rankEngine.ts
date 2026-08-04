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

  // Count GREEN direct recruits only (immediate children with ≥₹1,260 sales).
  // Used for BRONZE qualification — BRONZE requires 6 direct recruits, not 6 anywhere in tree.
  function countGreenDirects(id: string): number {
    return (children.get(id) ?? []).filter(
      (childId) => (salesByMember.get(childId) ?? 0) >= 1260
    ).length;
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
  // BRONZE: requires N green DIRECT recruits + own ≥₹1,260.
  // SILVER+: requires N green total team + own ≥₹1,260.
  function calcPromotedRank(userId: string, currentRank: Rank, greenDirects: number, greenTeamSize: number): Rank {
    const ownSales = salesByMember.get(userId) ?? 0;
    const currentIdx = RANK_ORDER.indexOf(currentRank);
    let promoted: Rank = currentRank; // never go below current

    for (let i = currentIdx + 1; i < RANK_ORDER.length; i++) {
      const r = RANK_ORDER[i];
      // BRONZE uses direct count; SILVER and above use total team count
      const qualifyingCount = r === "BRONZE" ? greenDirects : greenTeamSize;
      if (qualifyingCount >= RANK_MIN_TEAM[r] && ownSales >= 1260) {
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
    const greenDirects = countGreenDirects(user.id);
    const greenTeamSize = countGreenDownline(user.id);
    const newRank = calcPromotedRank(user.id, user.rank, greenDirects, greenTeamSize);
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
        reason: `Promoted: ${c.greenTeamSize} active members (≥₹1260 each) of ${c.teamSize} total + own ₹1260 met`,
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
