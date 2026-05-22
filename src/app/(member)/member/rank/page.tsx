import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Lock, Trophy } from "lucide-react";

const RANK_MIN_TEAM_DISPLAY: Record<string, string> = {
  DISTRIBUTOR: "—", BRONZE: "5", SILVER: "25", GOLDEN: "125",
  DIAMOND: "625", SUPER_DIAMOND: "3,125", PLATINUM: "15,625", CENTENNIAL: "78,125",
};

const rankTargets: Record<string, number> = {
  DISTRIBUTOR:   1800,
  BRONZE:        9000,
  SILVER:        45000,
  GOLDEN:        225000,
  DIAMOND:       1125000,
  SUPER_DIAMOND: 5625000,
  PLATINUM:      28125000,
  CENTENNIAL:    0,
};

const rankOrder = [
  "DISTRIBUTOR","BRONZE","SILVER","GOLDEN","DIAMOND","SUPER_DIAMOND","PLATINUM","CENTENNIAL",
];

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

const rankHeroColors: Record<string, string> = {
  DISTRIBUTOR:   "bg-gray-500",
  BRONZE:        "bg-amber-500",
  SILVER:        "bg-slate-400",
  GOLDEN:        "bg-yellow-500",
  DIAMOND:       "bg-blue-500",
  SUPER_DIAMOND: "bg-blue-700",
  PLATINUM:      "bg-purple-600",
  CENTENNIAL:    "bg-green-600",
};

export default async function RankPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [member, monthSalesAgg] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        rank: true,
        _count: { select: { downline: true } },
      },
    }),
    prisma.sale.aggregate({
      where: { memberId: userId, month, year },
      _sum: { amount: true },
    }),
  ]);

  const rank = member?.rank ?? session?.user?.rank ?? "DISTRIBUTOR";
  const target = rankTargets[rank] ?? 1800;
  const currentSales = monthSalesAgg._sum.amount ?? 0;
  const progress = target > 0 ? Math.min((currentSales / target) * 100, 100) : 100;
  const currentRankIndex = rankOrder.indexOf(rank);
  const teamSize = member?._count?.downline ?? 0;

  return (
    <div className="max-w-lg mx-auto">
      {/* Current Rank Hero Card */}
      <Card className="mb-5 overflow-hidden">
        <div className={`${rankHeroColors[rank] ?? "bg-green-600"} p-6 text-white`}>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 opacity-90" />
            <div>
              <p className="text-xs font-medium opacity-80 uppercase tracking-wider">
                Current Rank
              </p>
              <h1 className="text-2xl font-bold">
                {rank.replace(/_/g, " ")}
              </h1>
            </div>
          </div>
          <p className="text-sm opacity-80">
            {rank === "CENTENNIAL"
              ? "Top rank achieved — Centennial level"
              : `Your rank is permanent — it will never be taken away`}
          </p>
        </div>
        <CardContent className="p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">This Month Sales</span>
            <span className="font-bold text-gray-900">
              ₹{currentSales.toLocaleString("en-IN")} / ₹{target.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className={`h-2.5 rounded-full transition-all ${
                progress >= 100 ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{progress.toFixed(0)}% of target</span>
            {currentSales < target && (
              <span>
                ₹{(target - currentSales).toLocaleString("en-IN")} remaining
              </span>
            )}
            {currentSales >= target && (
              <span className="text-green-600 font-medium">Target met!</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Promotion requirements */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Next Rank Requirements</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Team size (direct members)</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{teamSize}</span>
                <Badge className={`text-xs ${teamSize >= 5 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {teamSize >= 5 ? "Met ✓" : `Need ${5 - teamSize} more`}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Own sales this month</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">₹{currentSales.toLocaleString("en-IN")}</span>
                <Badge className={`text-xs ${currentSales >= 1800 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {currentSales >= 1800 ? "Met ✓" : `Need ₹${(1800 - currentSales).toLocaleString("en-IN")} more`}
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Both conditions must be met in the same month to advance. Salary also requires both conditions every month.</p>
        </CardContent>
      </Card>

      {/* Rank Ladder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800">
            Rank Ladder
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {rankOrder.map((r, i) => {
              const isCurrent = r === rank;
              const isAchieved = i < currentRankIndex;
              const isLocked = i > currentRankIndex;
              const rTarget = rankTargets[r];

              return (
                <div
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? "border-green-400 bg-green-50 shadow-sm"
                      : isAchieved
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  {/* Status icon */}
                  <div className="shrink-0">
                    {isAchieved ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : isCurrent ? (
                      <Trophy className="w-5 h-5 text-green-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  {/* Rank name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isCurrent
                            ? "text-green-800"
                            : isAchieved
                            ? "text-gray-600"
                            : "text-gray-400"
                        }`}
                      >
                        {r.replace(/_/g, " ")}
                      </span>
                      {isCurrent && (
                        <Badge className="text-xs bg-green-600 text-white px-1.5 py-0">
                          Current
                        </Badge>
                      )}
                      {isAchieved && (
                        <Badge className={`text-xs ${rankColors[r]}`}>
                          Achieved
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r === "CENTENNIAL"
                        ? "Top rank — no further target"
                        : isAchieved
                        ? "Permanently achieved"
                        : `Requires ≥ ₹1,800/month + ${RANK_MIN_TEAM_DISPLAY[r]} team members`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
