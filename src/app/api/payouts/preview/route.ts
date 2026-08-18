import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RANK_MIN_TEAM } from "@/lib/rankEngine";

const RANK_SALARY: Record<string, number> = {
  DISTRIBUTOR:   0,
  BRONZE:        500,
  SILVER:        1000,
  GOLDEN:        5000,
  DIAMOND:       15000,
  SUPER_DIAMOND: 30000,
  PLATINUM:      75000,
  CENTENNIAL:    100000,
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? "0");
  const year  = parseInt(searchParams.get("year")  ?? "0");
  if (!month || !year) return NextResponse.json({ error: "month and year required" }, { status: 400 });

  // Fetch all active distributors
  const members = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR", deletedAt: null },
    select: { id: true, name: true, memberId: true, rank: true, sponsorId: true },
  });

  // All sales for this month (everyone)
  const allSales = await prisma.sale.findMany({
    where: { month, year, deletedAt: null },
    select: { memberId: true, amount: true },
  });

  // Sales per member map
  const salesByMember = new Map<string, number>();
  for (const s of allSales) {
    salesByMember.set(s.memberId, (salesByMember.get(s.memberId) ?? 0) + s.amount);
  }

  // Build parent→children map for BFS
  const children = new Map<string, string[]>();
  for (const m of members) {
    if (m.sponsorId) {
      if (!children.has(m.sponsorId)) children.set(m.sponsorId, []);
      children.get(m.sponsorId)!.push(m.id);
    }
  }

  // BFS downline sales
  const downlineSalesCache = new Map<string, number>();
  function getDownlineSales(id: string): number {
    if (downlineSalesCache.has(id)) return downlineSalesCache.get(id)!;
    let total = 0;
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
      const cur = queue.shift()!;
      total += salesByMember.get(cur) ?? 0;
      queue.push(...(children.get(cur) ?? []));
    }
    downlineSalesCache.set(id, total);
    return total;
  }

  // Count ALL direct recruits (headcount, any sales).
  function countDirects(id: string): number {
    return (children.get(id) ?? []).length;
  }

  // BFS: count active total team (≥₹1,260 own sales this month, all depths).
  // Used for SILVER+ salary gate.
  function countGreenDownline(id: string): number {
    let count = 0;
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
      const cur = queue.shift()!;
      if ((salesByMember.get(cur) ?? 0) >= 1260) count++;
      queue.push(...(children.get(cur) ?? []));
    }
    return count;
  }

  // Commissions for this month — BI excluded (paid separately via BI Release)
  // Exclude commissions from soft-deleted sales (filter by active saleIds)
  const activeSaleIds = await prisma.sale.findMany({
    where: { month, year, deletedAt: null },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  const commissions = await prisma.commissionRecord.findMany({
    where: { month, year, saleId: { in: activeSaleIds } },
    select: { memberId: true, type: true, amount: true },
  });

  // PI Rate for this month (set by admin in Incentives → PI Rate tab)
  const piRateRecord = await prisma.piRate.findUnique({ where: { month_year: { month, year } } });
  const piRatePerPoint = piRateRecord?.ratePerPoint ?? null;

  const commByMember = new Map<string, { business: number; piPoints: number; biPoints: number }>();
  for (const c of commissions) {
    if (!commByMember.has(c.memberId)) commByMember.set(c.memberId, { business: 0, piPoints: 0, biPoints: 0 });
    const rec = commByMember.get(c.memberId)!;
    if (c.type === "BUSINESS") rec.business  += c.amount;
    if (c.type === "PI")       rec.piPoints  += c.amount;
    if (c.type === "BI")       rec.biPoints  += c.amount;
  }

  // Already paid this month
  const paid = await prisma.payoutRecord.findMany({
    where: { month, year },
    select: { memberId: true },
  });
  const paidSet = new Set(paid.map((p) => p.memberId));

  const result = members.map((m) => {
    const ownSales            = salesByMember.get(m.id) ?? 0;
    const ownQualifies        = ownSales >= 1260;
    // BRONZE: 6 directs (any sales) + combined direct sales ≥ ₹7,560
    // SILVER+: N green total team members (each ≥ ₹1,260)
    const directCount         = countDirects(m.id);
    const downlineSalesSum    = getDownlineSales(m.id);
    const greenTeamSize       = countGreenDownline(m.id);
    const minTeamRequired     = RANK_MIN_TEAM[m.rank as keyof typeof RANK_MIN_TEAM] ?? 0;
    const bronzeQualifies     = directCount >= 6 && downlineSalesSum >= 7560;
    const salaryBlocked       = !ownQualifies || (m.rank === "BRONZE" ? !bronzeQualifies : greenTeamSize < minTeamRequired);
    const salary              = salaryBlocked ? 0 : (RANK_SALARY[m.rank] ?? 0);
    const comm                = commByMember.get(m.id) ?? { business: 0, piPoints: 0, biPoints: 0 };
    const piPoints            = parseFloat(comm.piPoints.toFixed(2));
    const biPoints            = parseFloat(comm.biPoints.toFixed(2));
    const piAmount            = piRatePerPoint !== null ? parseFloat((piPoints * piRatePerPoint).toFixed(2)) : 0;
    const groupVolume         = ownSales + getDownlineSales(m.id);

    return {
      memberId:             m.id,
      name:                 m.name,
      memberIdCode:         m.memberId,
      rank:                 m.rank,
      ownSales,
      qualifiesForSalary:   ownQualifies,
      greenTeamSize,
      minTeamRequired,
      salaryBlocked,
      salary,
      businessCommission:   parseFloat(comm.business.toFixed(2)),
      piPoints,
      biPoints,
      piRatePerPoint,
      piAmount,
      groupVolume:          parseFloat(groupVolume.toFixed(2)),
      alreadyPaid:          paidSet.has(m.id),
    };
  }).filter((m) => m.salary > 0 || m.businessCommission > 0 || m.piPoints > 0 || m.biPoints > 0);

  return NextResponse.json({ members: result, piRateSet: piRatePerPoint !== null, piRatePerPoint });
}
