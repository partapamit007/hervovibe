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

  // Collect each sale's seller PI and BI totals
  const sellerRecords = await prisma.commissionRecord.findMany({
    where: { type: { in: ["PI", "BI"] }, depth: 0 },
    select: { saleId: true, fromMemberId: true, month: true, year: true, type: true, amount: true },
  });

  const saleMap: Record<string, {
    fromMemberId: string; month: number; year: number; totalPI: number; totalBI: number;
  }> = {};

  for (const r of sellerRecords) {
    if (!saleMap[r.saleId]) {
      saleMap[r.saleId] = { fromMemberId: r.fromMemberId, month: r.month, year: r.year, totalPI: 0, totalBI: 0 };
    }
    if (r.type === "PI") saleMap[r.saleId].totalPI += r.amount;
    if (r.type === "BI") saleMap[r.saleId].totalBI += r.amount;
  }

  // Rebuild upline records with halving formula
  const newRecords: {
    memberId: string; saleId: string; fromMemberId: string;
    month: number; year: number; type: "PI" | "BI"; amount: number; depth: number;
  }[] = [];

  for (const [saleId, data] of Object.entries(saleMap)) {
    const seller = await prisma.user.findFirst({
      where: { id: data.fromMemberId, deletedAt: null },
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

    const base = { saleId, fromMemberId: data.fromMemberId, month: data.month, year: data.year };

    for (const [idx, u] of uplineChain.entries()) {
      const depth = idx + 1;
      const halvingFactor = Math.pow(0.5, depth);
      const uplinePIAmt = parseFloat((data.totalPI * halvingFactor).toFixed(2));
      const uplineBIAmt = parseFloat((data.totalBI * halvingFactor).toFixed(2));
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
    salesProcessed: Object.keys(saleMap).length,
  });
}
