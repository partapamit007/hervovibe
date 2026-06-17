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

  // 2. Seller's PI = piRate% of MRP per product per unit
  let totalSellerPI = 0;
  // Per upline: each member earns piUpline% of MRP per product per unit (flat, same for every level)
  // Per upline: each member earns biRate% of MRP per product per unit (flat, same for every level)
  // uplineEarnings[uplineMemberId] = { pi, bi } — accumulated across all sale items
  interface UplineEarning { pi: number; bi: number; }
  const uplineEarnings: { pi: number; bi: number }[] = []; // index = depth-1

  for (const item of sale.saleItems) {
    const piRate    = (item.product?.piRate    ?? 10) / 100;
    const piUpline  = (item.product?.piUpline  ?? 0)  / 100;
    const biRate    = (item.product?.biRate    ?? 1)   / 100;
    const qty       = item.quantity;
    const mrp       = item.mrpAtSale;

    totalSellerPI += qty * mrp * piRate;

    // These per-item amounts will be added to each upline member later
    if (!uplineEarnings[0]) {
      // We store per-item upline PI and BI amounts, keyed by item index; we'll distribute after building chain
      // For now, accumulate totals that apply to EACH upline member
    }
    // Accumulate: we need upline chain to distribute, so store per-item rates
    (item as any)._piUplineRate = piUpline;
    (item as any)._biRate       = biRate;
  }

  // Fallback if no sale items (manual amount entry)
  const noItems = sale.saleItems.length === 0;
  if (noItems) {
    const globalBiRate = await getBiBaseRate();
    totalSellerPI = sale.amount * 0.10;
  }

  if (totalSellerPI >= 0.01) {
    records.push({ ...base, memberId: sale.memberId, type: "PI", amount: parseFloat(totalSellerPI.toFixed(2)), depth: 0 });
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

  // 4. PI and BI for upline — each member at every level earns the same fixed % of MRP
  if (uplineChain.length > 0) {
    if (noItems) {
      // No product items — use global BI rate; PI upline = 0 (no piUpline configured without products)
      const globalBiRate = await getBiBaseRate();
      const totalUplineBI = sale.amount * globalBiRate;
      if (totalUplineBI >= 0.01) {
        uplineChain.forEach((u, idx) => {
          records.push({ ...base, memberId: u.id, type: "BI", amount: parseFloat(totalUplineBI.toFixed(2)), depth: idx + 1 });
        });
      }
    } else {
      // Product-based: each upline earns piUpline% and biRate% of each product's MRP × qty
      for (const [idx, u] of uplineChain.entries()) {
        const depth = idx + 1;
        let uplinePIAmt = 0;
        let uplineBIAmt = 0;
        for (const item of sale.saleItems) {
          const piUplineRate = (item.product?.piUpline ?? 0) / 100;
          const biRateVal    = (item.product?.biRate   ?? 1) / 100;
          uplinePIAmt += item.quantity * item.mrpAtSale * piUplineRate;
          uplineBIAmt += item.quantity * item.mrpAtSale * biRateVal;
        }
        if (uplinePIAmt >= 0.01) {
          records.push({ ...base, memberId: u.id, type: "PI", amount: parseFloat(uplinePIAmt.toFixed(2)), depth });
        }
        if (uplineBIAmt >= 0.01) {
          records.push({ ...base, memberId: u.id, type: "BI", amount: parseFloat(uplineBIAmt.toFixed(2)), depth });
        }
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
