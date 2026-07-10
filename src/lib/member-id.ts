import { prisma } from "@/lib/prisma";

// Configurable via env var MEMBER_ID_PREFIX, default: BHV
export const MEMBER_PREFIX = process.env.MEMBER_ID_PREFIX ?? "BHV";

/**
 * Generates the next available member ID.
 * - Root (no sponsor): BHV-1, BHV-2, ...
 * - Child: parentId/1, parentId/2, ... up to /6
 */
export async function generateNextMemberId(sponsorDbId: string | null | undefined): Promise<string> {
  if (!sponsorDbId) {
    // Root member — find next unused root number (include deleted to never reuse IDs)
    const roots = await prisma.user.findMany({
      where: { role: "DISTRIBUTOR", sponsorId: null },
      select: { memberId: true },
    });
    const usedNums = roots
      .map((r) => {
        if (!r.memberId) return null;
        const m = r.memberId.match(/^[A-Z]+-(\d+)$/);
        return m ? parseInt(m[1]) : null;
      })
      .filter((n): n is number => n !== null);
    let next = 1;
    while (usedNums.includes(next)) next++;
    return `${MEMBER_PREFIX}-${next}`;
  }

  // Child member — get sponsor and their existing children
  const sponsor = await prisma.user.findUnique({
    where: { id: sponsorDbId },
    select: { memberId: true },
  });
  if (!sponsor || !sponsor.memberId) throw new Error("Sponsor not found");

  // Count only ACTIVE children for the 6-slot fullness check
  const activeChildren = await prisma.user.findMany({
    where: { sponsorId: sponsorDbId, deletedAt: null },
    select: { memberId: true },
  });

  if (activeChildren.length >= 6)
    throw new Error("This parent already has 6 direct members. Please select another sponsor.");

  // Include soft-deleted members when finding used positions — never reuse a position number
  const allChildren = await prisma.user.findMany({
    where: { sponsorId: sponsorDbId },
    select: { memberId: true },
  });

  // Find used child positions (last segment after final "/")
  const usedPositions = allChildren
    .map((c) => {
      if (!c.memberId) return NaN;
      const parts = c.memberId.split("/");
      return parseInt(parts[parts.length - 1]);
    })
    .filter((n) => !isNaN(n));

  for (let i = 1; i <= 6; i++) {
    if (!usedPositions.includes(i)) {
      return `${sponsor.memberId}/${i}`;
    }
  }

  throw new Error("No positions available under this parent.");
}

/** Derives depth level from memberId: BHV-1 = 1, BHV-1/1 = 2, BHV-1/1/3 = 3 */
export function getMemberLevel(memberId: string): number {
  return memberId.split("/").length;
}

/** Derives child position from memberId (last segment after "/") */
export function getChildPosition(memberId: string): number | null {
  const parts = memberId.split("/");
  if (parts.length < 2) return null;
  return parseInt(parts[parts.length - 1]) || null;
}
