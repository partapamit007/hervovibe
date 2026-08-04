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

const COMM_BASE = 1260; // business commission always on fixed ₹1,260 base, not actual sale amount

export async function calculateCommissions(saleId: string) {
  // Idempotency guard — if commissions already exist for this sale, skip
  const existing = await prisma.commissionRecord.findFirst({ where: { saleId } });
  if (existing) return;

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

  // 1. Seller's 8% BUSINESS commission — always on fixed ₹1,800 base
  records.push({ ...base, memberId: sale.memberId, type: "BUSINESS", amount: COMM_BASE * 0.08, depth: 0 });

  // 2. Seller's PI and BI — fixed ₹ per unit from product config (piRate / biRate)
  //    Upline base — fixed ₹ per unit from product config (piUpline / biUpline), L1 gets full, then halves
  let totalSellerPI = 0;
  let totalSellerBI = 0;
  let totalUplinePI = 0;
  let totalUplineBI = 0;
  const noItems = sale.saleItems.length === 0;

  for (const item of sale.saleItems) {
    const qty = item.quantity;
    totalSellerPI += qty * (item.product?.piRate   ?? 0);
    totalSellerBI += qty * (item.product?.biRate   ?? 0);
    totalUplinePI += qty * (item.product?.piUpline ?? 0);
    totalUplineBI += qty * (item.product?.biUpline ?? 0);
  }

  if (noItems) {
    // No product items — use fixed ₹1,260 base with global BI rate
    const globalBiRate = await getBiBaseRate();
    totalSellerBI = COMM_BASE * globalBiRate;
  }

  if (totalSellerPI >= 0.01)
    records.push({ ...base, memberId: sale.memberId, type: "PI", amount: parseFloat(totalSellerPI.toFixed(2)), depth: 0 });
  if (totalSellerBI >= 0.01)
    records.push({ ...base, memberId: sale.memberId, type: "BI", amount: parseFloat(totalSellerBI.toFixed(2)), depth: 0 });

  // 3. Walk entire sponsor chain in memory — one prefetch, zero N+1
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, rank: true, sponsorId: true },
  });
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const uplineChain: { id: string; rank: string; sponsorId: string | null }[] = [];
  let curSponsorId = sale.member.sponsorId;
  const visited = new Set<string>();
  while (curSponsorId && !visited.has(curSponsorId)) {
    visited.add(curSponsorId);
    const upline = userMap.get(curSponsorId);
    if (!upline) break;
    uplineChain.push(upline);
    curSponsorId = upline.sponsorId;
  }

  // 4. PI and BI for upline — every upline member gets the same fixed amount (no halving)
  if (uplineChain.length > 0) {
    for (const [idx, u] of uplineChain.entries()) {
      const depth = idx + 1;
      const uplinePIAmt = parseFloat(totalUplinePI.toFixed(2));
      const uplineBIAmt = parseFloat(totalUplineBI.toFixed(2));
      if (uplinePIAmt >= 0.01)
        records.push({ ...base, memberId: u.id, type: "PI", amount: uplinePIAmt, depth });
      if (uplineBIAmt >= 0.01)
        records.push({ ...base, memberId: u.id, type: "BI", amount: uplineBIAmt, depth });
    }
  }

  // 5. BUSINESS (rank-gated) per upline level
  uplineChain.forEach((upline, idx) => {
    const depth = idx + 1;
    const maxDepth = RANK_MAX_DEPTH[upline.rank] ?? 0;
    if (maxDepth >= depth && DEPTH_PCT[depth]) {
      records.push({ ...base, memberId: upline.id, type: "BUSINESS", amount: COMM_BASE * DEPTH_PCT[depth], depth });
    }
  });

  if (records.length > 0) {
    await prisma.commissionRecord.createMany({ data: records });
  }
}
