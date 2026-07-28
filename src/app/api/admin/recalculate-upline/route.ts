import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Delete all upline PI and BI records (depth > 0); seller records (depth=0) stay
  const deleted = await prisma.commissionRecord.deleteMany({
    where: { type: { in: ["PI", "BI"] }, depth: { gt: 0 } },
  });

  // Get all sales that have seller PI or BI records (depth 0)
  const sellerRecords = await prisma.commissionRecord.findMany({
    where: { type: { in: ["PI", "BI"] }, depth: 0 },
    select: { saleId: true, fromMemberId: true, month: true, year: true },
  });

  // Deduplicate by saleId
  const saleIds = [...new Set(sellerRecords.map(r => r.saleId))];
  const saleMetaMap: Record<string, { fromMemberId: string; month: number; year: number }> = {};
  for (const r of sellerRecords) saleMetaMap[r.saleId] = { fromMemberId: r.fromMemberId, month: r.month, year: r.year };

  const newRecords: {
    memberId: string; saleId: string; fromMemberId: string;
    month: number; year: number; type: "PI" | "BI"; amount: number; depth: number;
  }[] = [];

  for (const saleId of saleIds) {
    const meta = saleMetaMap[saleId];

    // Fetch sale items with product piUpline/biUpline (fixed ₹/unit values)
    const saleItems = await prisma.saleItem.findMany({
      where: { saleId },
      include: { product: { select: { piUpline: true, biUpline: true } } },
    });

    let totalUplinePI = 0;
    let totalUplineBI = 0;
    for (const item of saleItems) {
      totalUplinePI += item.quantity * (item.product?.piUpline ?? 0);
      totalUplineBI += item.quantity * (item.product?.biUpline ?? 0);
    }

    // Get seller's sponsor to start upline chain
    const seller = await prisma.user.findFirst({
      where: { id: meta.fromMemberId, deletedAt: null },
      select: { sponsorId: true },
    });
    if (!seller?.sponsorId) continue;

    const uplineChain: { id: string; sponsorId: string | null }[] = [];
    let curSponsorId: string | null = seller.sponsorId;
    while (curSponsorId) {
      const upline: { id: string; sponsorId: string | null } | null = await prisma.user.findFirst({
        where: { id: curSponsorId, deletedAt: null },
        select: { id: true, sponsorId: true },
      });
      if (!upline) break;
      uplineChain.push(upline);
      curSponsorId = upline.sponsorId;
    }

    const base = { saleId, fromMemberId: meta.fromMemberId, month: meta.month, year: meta.year };

    // L1 gets full piUpline base, L2 gets 50%, L3 gets 25%, etc.
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
    salesProcessed: saleIds.length,
  });
}
