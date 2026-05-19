import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function MemberDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [member, thisMonthSales, recentSales] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        rank: true,
        _count: { select: { downline: true } },
      },
    }),
    prisma.sale.findMany({
      where: { memberId: userId, month, year },
    }),
    prisma.sale.findMany({
      where: { memberId: userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    }),
  ]);

  const rank = member?.rank ?? session?.user?.rank ?? "DISTRIBUTOR";
  const target = rankTargets[rank] ?? 1800;
  const thisMonthTotal = thisMonthSales.reduce((s, e) => s + e.amount, 0);
  const teamSize = member?._count?.downline ?? 0;

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">Hi, {session?.user?.name?.split(" ")[0]} 👋</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge className="bg-green-100 text-green-700 text-xs">{rank.replace(/_/g, " ")}</Badge>
          {session?.user?.memberId && (
            <span className="text-xs text-gray-400">ID: {session.user.memberId}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">This Month Sales</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-green-600">₹{thisMonthTotal.toLocaleString("en-IN")}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Monthly Target</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">₹{target.toLocaleString("en-IN")}</span>
            <p className={`text-xs mt-0.5 ${thisMonthTotal >= target ? "text-green-600" : "text-amber-600"}`}>
              {thisMonthTotal >= target ? "Target met ✓" : `₹${(target - thisMonthTotal).toLocaleString("en-IN")} remaining`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Earnings</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">₹—</span>
            <p className="text-xs text-gray-400 mt-0.5">Phase 4</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Direct Team</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">{teamSize}</span>
            <p className={`text-xs mt-0.5 ${teamSize >= 5 ? "text-green-600" : "text-amber-600"}`}>
              {teamSize >= 5 ? "Min. met ✓" : `${5 - teamSize} more needed`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No sales recorded yet</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((s) => (
                <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
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
