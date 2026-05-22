import { prisma } from "@/lib/prisma";

const DEPTH_PCT: Record<number, number> = {
  1: 0.04,
  2: 0.02,
  3: 0.015,
  4: 0.01,
  5: 0.0075,
  6: 0.005,
  7: 0.0025,
};

const RANK_MAX_DEPTH: Record<string, number> = {
  DISTRIBUTOR:   0,
  BRONZE:        1,
  SILVER:        2,
  GOLDEN:        3,
  DIAMOND:       4,
  SUPER_DIAMOND: 5,
  PLATINUM:      6,
  CENTENNIAL:    7,
};

export async function calculateCommissions(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      member: true,
      saleItems: { include: { product: true } },
    },
  });
  if (!sale) return;

  const records: {
    memberId: string;
    saleId: string;
    fromMemberId: string;
    month: number;
    year: number;
    type: "BUSINESS" | "PI" | "BI";
    amount: number;
    depth: number;
  }[] = [];

  const base = {
    saleId: sale.id,
    fromMemberId: sale.memberId,
    month: sale.month,
    year: sale.year,
  };

  // Seller's own 8% business commission
  records.push({ ...base, memberId: sale.memberId, type: "BUSINESS", amount: sale.amount * 0.08, depth: 0 });

  // Seller's own PI (direct value)
  for (const item of sale.saleItems) {
    if (item.product.piDirect > 0)
      records.push({ ...base, memberId: sale.memberId, type: "PI", amount: item.quantity * item.product.piDirect, depth: 0 });
  }

  // Walk up the sponsor chain (up to 7 levels)
  let currentSponsorId = sale.member.sponsorId;
  for (let depth = 1; depth <= 7 && currentSponsorId; depth++) {
    const upline = await prisma.user.findUnique({ where: { id: currentSponsorId } });
    if (!upline) break;

    const maxDepth = RANK_MAX_DEPTH[upline.rank] ?? 0;

    // Business commission — only if this upline's rank qualifies for this depth
    if (maxDepth >= depth && DEPTH_PCT[depth]) {
      records.push({ ...base, memberId: upline.id, type: "BUSINESS", amount: sale.amount * DEPTH_PCT[depth], depth });
    }

    // PI upline — halves at each level going up
    // L1 gets piUpline × 1, L2 gets × 0.5, L3 gets × 0.25, etc.
    for (const item of sale.saleItems) {
      if (item.product.piUpline > 0) {
        const piAmount = item.quantity * item.product.piUpline * Math.pow(0.5, depth - 1);
        if (piAmount >= 0.01)
          records.push({ ...base, memberId: upline.id, type: "PI", amount: piAmount, depth });
      }
    }

    // BI is manually decided by client — NOT auto-calculated per product

    currentSponsorId = upline.sponsorId;
  }

  if (records.length > 0) {
    await prisma.commissionRecord.createMany({ data: records });
  }
}
