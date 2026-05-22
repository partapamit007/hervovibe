import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeIdColor, idColorStyles } from "@/lib/idColor";

const RANK_ORDER = ["DISTRIBUTOR","BRONZE","SILVER","GOLDEN","DIAMOND","SUPER_DIAMOND","PLATINUM","CENTENNIAL"];
const RANK_MIN_TEAM: Record<string, number> = {
  DISTRIBUTOR: 0, BRONZE: 5, SILVER: 25, GOLDEN: 125,
  DIAMOND: 625, SUPER_DIAMOND: 3125, PLATINUM: 15625, CENTENNIAL: 78125,
};
const RANK_SALARY: Record<string, number> = {
  DISTRIBUTOR: 0, BRONZE: 0, SILVER: 1000, GOLDEN: 5000,
  DIAMOND: 15000, SUPER_DIAMOND: 30000, PLATINUM: 75000, CENTENNIAL: 100000,
};
const rankColors: Record<string, string> = {
  DISTRIBUTOR:   "bg-gray-100 text-gray-700",
  BRONZE:        "bg-amber-100 text-amber-700",
  SILVER:        "bg-slate-100 text-slate-600",
  GOLDEN:        "bg-yellow-100 text-yellow-700",
  DIAMOND:       "bg-blue-100 text-blue-700",
  SUPER_DIAMOND: "bg-blue-200 text-blue-800",
  PLATINUM:      "bg-purple-100 text-purple-700",
  CENTENNIAL:    "bg-green-100 text-green-700",
};

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function getDownlineCount(memberId: string): Promise<number> {
  let count = 0;
  const queue = [memberId];
  while (queue.length) {
    const cur = queue.shift()!;
    const kids = await prisma.user.findMany({
      where: { sponsorId: cur, deletedAt: null },
      select: { id: true },
    });
    count += kids.length;
    queue.push(...kids.map(k => k.id));
  }
  return count;
}

async function getDownlineSales(memberId: string, month: number, year: number): Promise<number> {
  const ids: string[] = [];
  const queue = [memberId];
  while (queue.length) {
    const cur = queue.shift()!;
    const kids = await prisma.user.findMany({ where: { sponsorId: cur, deletedAt: null }, select: { id: true } });
    for (const k of kids) { ids.push(k.id); queue.push(k.id); }
  }
  if (ids.length === 0) return 0;
  const agg = await prisma.sale.aggregate({
    _sum: { amount: true },
    where: { memberId: { in: ids }, month, year, deletedAt: null },
  });
  return agg._sum.amount ?? 0;
}

export default async function MemberDashboard() {
  const session = await auth();
  const userId = session?.user?.id!;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Build last 4 months for id color
  const colorMonths: { month: number; year: number }[] = [];
  for (let i = 0; i < 4; i++) {
    let m = month - i; let y = year;
    if (m <= 0) { m += 12; y--; }
    colorMonths.push({ month: m, year: y });
  }

  const [member, thisMonthSales, recentSales, commissions, colorSales, piRate] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, memberId: true, rank: true, status: true, joiningDate: true },
    }),
    prisma.sale.findMany({ where: { memberId: userId, month, year, deletedAt: null } }),
    prisma.sale.findMany({
      where: { memberId: userId, deletedAt: null },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    }),
    prisma.commissionRecord.findMany({ where: { memberId: userId, month, year } }),
    prisma.sale.findMany({
      where: { memberId: userId, OR: colorMonths },
      select: { month: true, year: true, amount: true },
    }),
    prisma.piRate.findUnique({ where: { month_year: { month, year } } }),
  ]);

  const rank       = member?.rank ?? "DISTRIBUTOR";
  const ownSales   = thisMonthSales.reduce((s, e) => s + e.amount, 0);
  const qualifies  = ownSales >= 1800;
  // Salary also requires NO downline member to have zero sales this month
  // (shown as advisory — exact block is calculated in payouts preview)
  const salary     = qualifies ? (RANK_SALARY[rank] ?? 0) : 0;
  const idColor    = computeIdColor(colorSales, month, year);

  const businessComm = commissions.filter(c => c.type === "BUSINESS").reduce((s, c) => s + c.amount, 0);
  const piPoints     = commissions.filter(c => c.type === "PI").reduce((s, c) => s + c.amount, 0);
  const piAmount     = piRate ? piPoints * piRate.ratePerPoint : 0;
  const totalEarned  = businessComm + piAmount + salary;

  const [teamSize, downlineSalesTotal] = await Promise.all([
    getDownlineCount(userId),
    getDownlineSales(userId, month, year),
  ]);

  const groupVolume  = ownSales + downlineSalesTotal;

  // Rank progress
  const rankIdx      = RANK_ORDER.indexOf(rank);
  const nextRank     = rankIdx < RANK_ORDER.length - 1 ? RANK_ORDER[rankIdx + 1] : null;
  const nextTarget   = nextRank ? RANK_MIN_TEAM[nextRank] : null;
  const rankProgress = nextTarget ? Math.min(100, Math.round((teamSize / nextTarget) * 100)) : 100;

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="mb-5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Hi, {session?.user?.name?.split(" ")[0]}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`text-xs ${rankColors[rank]}`}>{rank.replace(/_/g," ")}</Badge>
              {member?.memberId && <span className="text-xs text-gray-400">ID: {member.memberId}</span>}
            </div>
          </div>
          {/* ID Color indicator */}
          <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs font-bold shrink-0 ${idColorStyles[idColor]}`}>
            <span>{idColor}</span>
          </div>
        </div>
      </div>

      {/* Salary status banner */}
      <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium flex items-center justify-between ${
        qualifies ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
      }`}>
        <span>{qualifies ? "Min. ₹1,800 sales met — salary active ✓" : `Sell ₹${(1800 - ownSales).toLocaleString("en-IN")} more this month to unlock salary`}</span>
        {salary > 0 && <span className="font-bold">₹{salary.toLocaleString("en-IN")}</span>}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">This Month Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-green-600">₹{ownSales.toLocaleString("en-IN")}</span>
            <p className={`text-xs mt-0.5 ${ownSales >= 1800 ? "text-green-600" : "text-amber-500"}`}>
              {ownSales >= 1800 ? "Target met ✓" : `₹${(1800 - ownSales).toLocaleString("en-IN")} to go`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Earned This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-blue-600">₹{totalEarned.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            <p className="text-xs text-gray-400 mt-0.5">Salary + Commission + PI</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Group Volume</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-purple-600">₹{groupVolume.toLocaleString("en-IN")}</span>
            <p className="text-xs text-gray-400 mt-0.5">Personal + {teamSize} downline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Team Size</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">{teamSize}</span>
            {nextRank && (
              <p className="text-xs text-gray-400 mt-0.5">{nextTarget! - teamSize} more for {nextRank.replace(/_/g," ")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commissions breakdown */}
      {(businessComm > 0 || piPoints > 0) && (
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-gray-700">This Month Earnings Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            {salary > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Salary ({rank.replace(/_/g," ")})</span>
                <span className="font-medium text-gray-800">₹{salary.toLocaleString("en-IN")}</span>
              </div>
            )}
            {businessComm > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Business Commission</span>
                <span className="font-medium text-blue-700">₹{businessComm.toFixed(2)}</span>
              </div>
            )}
            {piPoints > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">PI Points ({piPoints.toFixed(1)} pts{piRate ? ` × ₹${piRate.ratePerPoint}` : ""})</span>
                <span className="font-medium text-green-700">
                  {piRate ? `₹${piAmount.toFixed(2)}` : `${piPoints.toFixed(1)} pts`}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2 font-semibold">
              <span className="text-gray-700">Total</span>
              <span className="text-green-700">₹{totalEarned.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rank progress */}
      {nextRank && (
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-gray-700">Rank Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{rank.replace(/_/g," ")}</span>
              <span>{nextRank.replace(/_/g," ")} ({nextTarget!.toLocaleString("en-IN")} team)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${rankProgress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{teamSize} of {nextTarget!.toLocaleString("en-IN")} members ({rankProgress}%)</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Sales */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm text-gray-700">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No sales recorded yet</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s) => (
                <div key={s.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{monthNames[s.month - 1]} {s.year}</span>
                  <span className="text-sm font-medium text-green-600">₹{s.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
