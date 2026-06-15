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

  // 2. PI = piRate% of MRP per product (default 10%)
  let totalPI = 0;
  let totalBIBase = 0;
  for (const item of sale.saleItems) {
    const piRate = (item.product?.piRate ?? 10) / 100;
    const biRate = (item.product?.biRate ?? 1) / 100;
    totalPI      += item.quantity * item.mrpAtSale * piRate;
    totalBIBase  += item.quantity * item.mrpAtSale * biRate;
  }
  if (sale.saleItems.length === 0) {
    const globalBiRate = await getBiBaseRate();
    totalPI     = sale.amount * 0.10;
    totalBIBase = sale.amount * globalBiRate;
  }
  if (totalPI >= 0.01) {
    records.push({ ...base, memberId: sale.memberId, type: "PI", amount: parseFloat(totalPI.toFixed(2)), depth: 0 });
  }

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

  // 4. PI distributed equally among ALL upline members
  if (totalPI >= 0.01 && uplineChain.length > 0) {
    const piPerUpline = parseFloat((totalPI / uplineChain.length).toFixed(2));
    uplineChain.forEach((u, idx) => {
      records.push({ ...base, memberId: u.id, type: "PI", amount: piPerUpline, depth: idx + 1 });
    });
  }

  // 5. BUSINESS (rank-gated) per upline level
  uplineChain.forEach((upline, idx) => {
    const depth = idx + 1;
    const maxDepth = RANK_MAX_DEPTH[upline.rank] ?? 0;

    if (maxDepth >= depth && DEPTH_PCT[depth]) {
      records.push({ ...base, memberId: upline.id, type: "BUSINESS", amount: sale.amount * DEPTH_PCT[depth], depth });
    }
  });

  // 6. BI distributed equally among ALL upline members (same rule as PI)
  if (totalBIBase >= 0.01 && uplineChain.length > 0) {
    const biPerUpline = parseFloat((totalBIBase / uplineChain.length).toFixed(2));
    uplineChain.forEach((u, idx) => {
      records.push({ ...base, memberId: u.id, type: "BI", amount: biPerUpline, depth: idx + 1 });
    });
  }

  if (records.length > 0) {
    await prisma.commissionRecord.createMany({ data: records });
  }
}
