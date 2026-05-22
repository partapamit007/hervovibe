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

  function calcRank(teamSize: number): Rank {
    let rank: Rank = "DISTRIBUTOR";
    for (const r of RANK_ORDER) {
      if (teamSize >= RANK_MIN_TEAM[r]) rank = r;
    }
    return rank;
  }

  const changes: { memberId: string; oldRank: Rank; newRank: Rank; teamSize: number }[] = [];

  for (const user of allUsers) {
    const teamSize = countDownline(user.id);
    const newRank = calcRank(teamSize);
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
        reason: "Auto rank engine",
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
