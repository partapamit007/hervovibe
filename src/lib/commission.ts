import { prisma } from "@/lib/prisma";

// Business commission % by depth level (rank-gated)
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

async function getBiBaseRate(): Promise<number> {
  const config = await prisma.biConfig.findFirst();
  return config ? config.baseRate / 100 : 0.01;
}

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

  // 1. Seller's 8% BUSINESS commission
  records.push({ ...base, memberId: sale.memberId, type: "BUSINESS", amount: sale.amount * 0.08, depth: 0 });

  // 2. Seller's PI and BI = piRate% / biRate% of MRP per product per unit
  let totalSellerPI = 0;
  let totalSellerBI = 0;
  const noItems = sale.saleItems.length === 0;

  for (const item of sale.saleItems) {
    const qty = item.quantity;
    const mrp = item.mrpAtSale;
    totalSellerPI += qty * mrp * ((item.product?.piRate ?? 10) / 100);
    totalSellerBI += qty * mrp * ((item.product?.biRate ?? 1)  / 100);
  }

  if (noItems) {
    const globalBiRate = await getBiBaseRate();
    totalSellerPI = sale.amount * 0.10;
    totalSellerBI = sale.amount * globalBiRate;
  }

  if (totalSellerPI >= 0.01)
    records.push({ ...base, memberId: sale.memberId, type: "PI", amount: parseFloat(totalSellerPI.toFixed(2)), depth: 0 });
  if (totalSellerBI >= 0.01)
    records.push({ ...base, memberId: sale.memberId, type: "BI", amount: parseFloat(totalSellerBI.toFixed(2)), depth: 0 });

  // 3. Walk entire sponsor chain and collect upline
  const uplineChain: { id: string; rank: string; sponsorId: string | null }[] = [];
  let curSponsorId = sale.member.sponsorId;
  while (curSponsorId) {
    const upline = await prisma.user.findUnique({
      where: { id: curSponsorId },
      select: { id: true, rank: true, sponsorId: true },
    });
    if (!upline) break;
    uplineChain.push(upline);
    curSponsorId = upline.sponsorId;
  }

  // 4. PI and BI for upline — each member at every level earns the same fixed % of MRP
  if (uplineChain.length > 0) {
    if (noItems) {
      // No product items: no upline PI/BI (no per-product rates available)
    } else {
      // Each upline member earns piUpline% (PI) and biUpline% (BI) per product per unit — flat, same for all levels
      for (const [idx, u] of uplineChain.entries()) {
        const depth = idx + 1;
        let uplinePIAmt = 0;
        let uplineBIAmt = 0;
        for (const item of sale.saleItems) {
          uplinePIAmt += item.quantity * item.mrpAtSale * ((item.product?.piUpline ?? 0) / 100);
          uplineBIAmt += item.quantity * item.mrpAtSale * ((item.product?.biUpline ?? 0) / 100);
        }
        if (uplinePIAmt >= 0.01)
          records.push({ ...base, memberId: u.id, type: "PI", amount: parseFloat(uplinePIAmt.toFixed(2)), depth });
        if (uplineBIAmt >= 0.01)
          records.push({ ...base, memberId: u.id, type: "BI", amount: parseFloat(uplineBIAmt.toFixed(2)), depth });
      }
    }
  }

  // 5. BUSINESS (rank-gated) per upline level
  uplineChain.forEach((upline, idx) => {
    const depth = idx + 1;
    const maxDepth = RANK_MAX_DEPTH[upline.rank] ?? 0;
    if (maxDepth >= depth && DEPTH_PCT[depth]) {
      records.push({ ...base, memberId: upline.id, type: "BUSINESS", amount: sale.amount * DEPTH_PCT[depth], depth });
    }
  });

  if (records.length > 0) {
    await prisma.commissionRecord.createMany({ data: records });
  }
}
