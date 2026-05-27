import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { RANK_MIN_TEAM } from "@/lib/rankEngine";

const RANK_SALARY: Record<string, number> = {
  DISTRIBUTOR:   0,
  BRONZE:        0,
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

  // BFS: count active downline members (≥₹1,800 own sales this month)
  // Salary blocked if greenTeamSize < rank minimum — same condition as rank promotion.
  function countGreenDownline(id: string): number {
    let count = 0;
    const queue = [...(children.get(id) ?? [])];
    while (queue.length) {
      const cur = queue.shift()!;
      if ((salesByMember.get(cur) ?? 0) >= 1800) count++;
      queue.push(...(children.get(cur) ?? []));
    }
    return count;
  }

  // PI rate for this month
  const piRate = await prisma.piRate.findUnique({
    where: { month_year: { month, year } },
  });

  // Commissions for this month (all members)
  const commissions = await prisma.commissionRecord.findMany({
    where: { month, year },
    select: { memberId: true, type: true, amount: true },
  });

  const commByMember = new Map<string, { business: number; pi: number }>();
  for (const c of commissions) {
    if (!commByMember.has(c.memberId)) commByMember.set(c.memberId, { business: 0, pi: 0 });
    const rec = commByMember.get(c.memberId)!;
    if (c.type === "BUSINESS") rec.business += c.amount;
    if (c.type === "PI")       rec.pi       += c.amount;
  }

  // Already paid this month
  const paid = await prisma.payoutRecord.findMany({
    where: { month, year },
    select: { memberId: true },
  });
  const paidSet = new Set(paid.map((p) => p.memberId));

  const result = members.map((m) => {
    const ownSales            = salesByMember.get(m.id) ?? 0;
    const ownQualifies        = ownSales >= 1800;
    const greenTeamSize       = countGreenDownline(m.id);
    const minTeamRequired     = RANK_MIN_TEAM[m.rank as keyof typeof RANK_MIN_TEAM] ?? 0;
    const salaryBlocked       = !ownQualifies || greenTeamSize < minTeamRequired;
    const salary              = salaryBlocked ? 0 : (RANK_SALARY[m.rank] ?? 0);
    const comm                = commByMember.get(m.id) ?? { business: 0, pi: 0 };
    const groupVolume         = ownSales + getDownlineSales(m.id);
    const piRateValue         = piRate?.ratePerPoint ?? 0;

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
      piPoints:             parseFloat(comm.pi.toFixed(2)),
      piRatePerPoint:       piRateValue,
      piAmount:             parseFloat((comm.pi * piRateValue).toFixed(2)),
      groupVolume:          parseFloat(groupVolume.toFixed(2)),
      alreadyPaid:          paidSet.has(m.id),
    };
  }).filter((m) => m.salary > 0 || m.businessCommission > 0 || m.piAmount > 0);

  return NextResponse.json({ members: result, piRateSet: !!piRate });
}
