export const dynamic = "force-dynamic";

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

// Level-by-level BFS — 1 query per depth level (max 8), never 1 per node
async function getDownlineIds(memberId: string): Promise<string[]> {
  const allIds: string[] = [];
  let currentLevel = [memberId];
  while (currentLevel.length > 0) {
    const children = await prisma.user.findMany({
      where: { sponsorId: { in: currentLevel }, deletedAt: null },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);
    allIds.push(...childIds);
    currentLevel = childIds;
  }
  return allIds;
}

export default async function MemberDashboard() {
  const session = await auth();
  if (!session?.user?.id) {
    return <div className="p-8 text-center text-red-500">Session error — please log in again.</div>;
  }
  const userId = session.user.id;

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Need 4 months for BLACK detection
  const colorMonths: { month: number; year: number }[] = [];
  for (let i = 0; i < 4; i++) {
    let m = month - i; let y = year;
    if (m <= 0) { m += 12; y--; }
    colorMonths.push({ month: m, year: y });
  }

  const [member, thisMonthSales, colorSales] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, memberId: true, rank: true, joiningDate: true },
    }),
    prisma.sale.aggregate({
      _sum: { amount: true },
      where: { memberId: userId, month, year, deletedAt: null },
    }),
    prisma.sale.findMany({
      where: { memberId: userId, OR: colorMonths },
      select: { month: true, year: true, amount: true },
    }),
  ]);

  const rank     = member?.rank ?? "DISTRIBUTOR";
  const ownSales = thisMonthSales._sum.amount ?? 0;
  const qualifies = ownSales >= 1800;
  const salary    = qualifies ? (RANK_SALARY[rank] ?? 0) : 0;
  const idColor   = computeIdColor(colorSales, month, year);

  // Direct downline with their ID colors
  const directDownline = await prisma.user.findMany({
    where: { sponsorId: userId, deletedAt: null },
    select: { id: true, name: true, memberId: true, rank: true },
  });

  const directIds = directDownline.map((d) => d.id);
  const downlineSalesRaw = directIds.length > 0
    ? await prisma.sale.findMany({
        where: { memberId: { in: directIds }, OR: colorMonths },
        select: { memberId: true, month: true, year: true, amount: true },
      })
    : [];

  const downlineWithColors = directDownline.map((d) => {
    const sales = downlineSalesRaw.filter((s) => s.memberId === d.id);
    return { ...d, idColor: computeIdColor(sales, month, year) };
  });

  // Full downline GREEN count for rank progress (one CTE + one aggregation)
  const allDownlineIds = await getDownlineIds(userId);
  let greenTeamSize = 0;
  if (allDownlineIds.length > 0) {
    const greenRows = await prisma.sale.groupBy({
      by: ["memberId"],
      where: { memberId: { in: allDownlineIds }, month, year, deletedAt: null },
      _sum: { amount: true },
    });
    greenTeamSize = greenRows.filter((r) => (r._sum.amount ?? 0) >= 1800).length;
  }
  const teamSize = allDownlineIds.length;

  // Rank progress
  const rankIdx    = RANK_ORDER.indexOf(rank);
  const nextRank   = rankIdx < RANK_ORDER.length - 1 ? RANK_ORDER[rankIdx + 1] : null;
  const nextTarget = nextRank ? RANK_MIN_TEAM[nextRank] : null;
  const rankProgress = nextTarget ? Math.min(100, Math.round((greenTeamSize / nextTarget) * 100)) : 100;

  const atRiskDirect = downlineWithColors.filter(
    (d) => d.idColor === "RED" || d.idColor === "YELLOW" || d.idColor === "BLACK"
  );

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      {/* Header */}
      <div className="mb-5 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Hi, {session?.user?.name?.split(" ")[0]}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`text-xs ${rankColors[rank]}`}>
                {rank.replace(/_/g, " ")}
              </Badge>
              {member?.memberId && (
                <span className="text-xs text-gray-400">ID: {member.memberId}</span>
              )}
            </div>
          </div>
          {/* ID Color badge */}
          <div
            className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs font-bold shrink-0 ${idColorStyles[idColor]}`}
          >
            <span>{idColor}</span>
          </div>
        </div>
      </div>

      {/* Salary target banner */}
      <div
        className={`rounded-xl px-4 py-3 mb-4 text-sm font-medium flex items-center justify-between ${
          qualifies
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}
      >
        <span>
          {qualifies
            ? "Min. ₹1,800 sales met — salary active ✓"
            : `₹${(1800 - ownSales).toLocaleString("en-IN")} more needed to unlock salary`}
        </span>
        {salary > 0 && (
          <span className="font-bold">₹{salary.toLocaleString("en-IN")}</span>
        )}
      </div>

      {/* Personal sales + active team */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">My Sales This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-green-600">
              ₹{ownSales.toLocaleString("en-IN")}
            </span>
            <p className={`text-xs mt-0.5 ${ownSales >= 1800 ? "text-green-600" : "text-amber-500"}`}>
              {ownSales >= 1800 ? "Target met ✓" : `₹${(1800 - ownSales).toLocaleString("en-IN")} to go`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Active Team</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">{greenTeamSize}</span>
            <p className="text-xs text-gray-400 mt-0.5">
              {teamSize} total · {greenTeamSize} active (GREEN)
            </p>
            {nextRank && (
              <p className="text-xs text-amber-600 mt-0.5">
                {Math.max(0, nextTarget! - greenTeamSize)} more for {nextRank.replace(/_/g, " ")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rank progress */}
      {nextRank && (
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-gray-700">Rank Progress</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{rank.replace(/_/g, " ")}</span>
              <span>
                {nextRank.replace(/_/g, " ")} ({nextTarget!.toLocaleString("en-IN")} active)
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${rankProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {greenTeamSize} of {nextTarget!.toLocaleString("en-IN")} active members ({rankProgress}%)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Direct team with ID colors */}
      {downlineWithColors.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-gray-700">
              My Direct Team — {monthNames[month - 1]} Status
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1.5">
              {downlineWithColors.map((d) => (
                <div key={d.id} className="flex items-center gap-2.5 py-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${idColorStyles[d.idColor as keyof typeof idColorStyles]}`}
                    title={d.idColor}
                  >
                    {d.idColor[0]}
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{d.name}</span>
                  <Badge className={`text-xs ${rankColors[d.rank] ?? "bg-gray-100 text-gray-700"}`}>
                    {d.rank.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>

            {atRiskDirect.length > 0 && (
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠ {atRiskDirect.length} member{atRiskDirect.length > 1 ? "s" : ""} haven't reached ₹1,800 this month — this blocks your salary.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent personal sales */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm text-gray-700">My Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {colorSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No sales recorded yet</p>
          ) : (
            <div className="space-y-2">
              {colorSales
                .sort((a, b) => b.year - a.year || b.month - a.month)
                .slice(0, 6)
                .map((s, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-gray-600">
                      {monthNames[s.month - 1]} {s.year}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      ₹{s.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
