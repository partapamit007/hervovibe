import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete ALL PI and BI records — full rebuild with corrected fixed ₹/unit formula
  const deleted = await prisma.commissionRecord.deleteMany({
    where: { type: { in: ["PI", "BI"] } },
  });

  // Get all sales that have at least one sale item (needed for product rates)
  const sales = await prisma.sale.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      memberId: true,
      month: true,
      year: true,
      amount: true,
      member: { select: { sponsorId: true } },
      saleItems: {
        include: { product: { select: { piRate: true, piUpline: true, biRate: true, biUpline: true } } },
      },
    },
  });

  const newRecords: {
    memberId: string; saleId: string; fromMemberId: string;
    month: number; year: number; type: "PI" | "BI"; amount: number; depth: number;
  }[] = [];

  for (const sale of sales) {
    const base = { saleId: sale.id, fromMemberId: sale.memberId, month: sale.month, year: sale.year };

    // Seller amounts: qty × fixed ₹/unit
    let totalSellerPI = 0;
    let totalSellerBI = 0;
    let totalUplinePI = 0;
    let totalUplineBI = 0;

    for (const item of sale.saleItems) {
      const qty = item.quantity;
      totalSellerPI += qty * (item.product?.piRate   ?? 0);
      totalSellerBI += qty * (item.product?.biRate   ?? 0);
      totalUplinePI += qty * (item.product?.piUpline ?? 0);
      totalUplineBI += qty * (item.product?.biUpline ?? 0);
    }

    if (totalSellerPI >= 0.01)
      newRecords.push({ ...base, memberId: sale.memberId, type: "PI", amount: parseFloat(totalSellerPI.toFixed(2)), depth: 0 });
    if (totalSellerBI >= 0.01)
      newRecords.push({ ...base, memberId: sale.memberId, type: "BI", amount: parseFloat(totalSellerBI.toFixed(2)), depth: 0 });

    // Upline chain
    const uplineChain: { id: string; sponsorId: string | null }[] = [];
    let curSponsorId: string | null = sale.member.sponsorId;
    while (curSponsorId) {
      const upline: { id: string; sponsorId: string | null } | null = await prisma.user.findFirst({
        where: { id: curSponsorId, deletedAt: null },
        select: { id: true, sponsorId: true },
      });
      if (!upline) break;
      uplineChain.push(upline);
      curSponsorId = upline.sponsorId;
    }

    // L1 gets full piUpline amount, L2 gets 50%, L3 gets 25%, etc.
    for (const [idx, u] of uplineChain.entries()) {
      const depth = idx + 1;
      const halvingFactor = Math.pow(0.5, depth - 1);
      const uplinePIAmt = parseFloat((totalUplinePI * halvingFactor).toFixed(2));
      const uplineBIAmt = parseFloat((totalUplineBI * halvingFactor).toFixed(2));
      if (uplinePIAmt >= 0.01) newRecords.push({ ...base, memberId: u.id, type: "PI", amount: uplinePIAmt, depth });
      if (uplineBIAmt >= 0.01) newRecords.push({ ...base, memberId: u.id, type: "BI", amount: uplineBIAmt, depth });
    }
  }

  let created = 0;
  if (newRecords.length > 0) {
    const result = await prisma.commissionRecord.createMany({ data: newRecords });
    created = result.count;
  }

  return NextResponse.json({
    ok: true,
    deleted: deleted.count,
    created,
    salesProcessed: sales.length,
  });
}
