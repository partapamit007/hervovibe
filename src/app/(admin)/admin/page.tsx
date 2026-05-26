export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";
import AdminSalesTrend from "@/components/admin/AdminSalesTrend";

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

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user?.id) return <div className="p-8 text-center text-red-500">Session error — please log in again.</div>;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Build last 6 months for trend chart
  const trendMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - i, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }).reverse();

  // Members with ₹0 sales this month = RED (at risk)
  const membersWithSales = await prisma.sale.findMany({
    where: { month, year, deletedAt: null },
    select: { memberId: true },
    distinct: ["memberId"],
  });
  const membersWithSalesIds = new Set(membersWithSales.map((s) => s.memberId));

  const [totalMembers, activeMembers, monthlySales, recentSales, recentMembers, trendData] =
    await Promise.all([
      prisma.user.count({ where: { role: "DISTRIBUTOR", deletedAt: null } }),
      prisma.user.count({ where: { role: "DISTRIBUTOR", status: "ACTIVE", deletedAt: null } }),
      prisma.sale.aggregate({
        _sum: { amount: true },
        where: { month, year, deletedAt: null },
      }),
      prisma.sale.findMany({
        where: { month, year, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          member: { select: { name: true, memberId: true, rank: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: "DISTRIBUTOR", deletedAt: null },
        orderBy: { joiningDate: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          memberId: true,
          rank: true,
          status: true,
          joiningDate: true,
        },
      }),
      Promise.all(
        trendMonths.map(({ month: m, year: y }) =>
          prisma.sale.aggregate({
            _sum: { amount: true },
            where: { month: m, year: y, deletedAt: null },
          }).then(r => ({ month: new Date(y, m - 1).toLocaleString("en-IN", { month: "short" }), total: r._sum.amount || 0 }))
        )
      ),
    ]);

  const totalSalesAmount = monthlySales._sum.amount || 0;
  const redCount = activeMembers - membersWithSalesIds.size; // active members with ₹0 sales this month

  const stats = [
    {
      label: "Total Members",
      value: totalMembers.toString(),
      icon: Users,
      iconBg: "bg-blue-500",
    },
    {
      label: "Active Members",
      value: activeMembers.toString(),
      icon: Users,
      iconBg: "bg-green-500",
    },
    {
      label: "Sales This Month",
      value: `₹${totalSalesAmount.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      iconBg: "bg-purple-500",
    },
    {
      label: "RED This Month",
      value: redCount > 0 ? redCount.toString() : "0",
      sublabel: "₹0 sales — salary at risk",
      icon: AlertTriangle,
      iconBg: redCount > 0 ? "bg-red-500" : "bg-gray-400",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Welcome back, {session?.user?.name} &mdash;{" "}
          {now.toLocaleString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl ${stat.iconBg} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
                {"sublabel" in stat && stat.sublabel && (
                  <p className="text-xs text-red-500 mt-0.5">{stat.sublabel}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 6-Month Sales Trend */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" /> 6-Month Sales Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminSalesTrend data={trendData} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              Recent Sales &mdash;{" "}
              {now.toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="text-center py-10">
                <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No sales entries yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentSales.map((s, i) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between py-3 ${
                      i % 2 === 0 ? "" : "bg-gray-50/60"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {s.member.name}
                      </p>
                      <p className="text-xs text-gray-500">{s.member.memberId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`text-xs ${rankColors[s.member.rank]}`}
                      >
                        {s.member.rank.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm font-bold text-green-600">
                        ₹{s.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800">
              Recent Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMembers.length === 0 ? (
              <div className="text-center py-10">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No members yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentMembers.map((m, i) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between py-3 ${
                      i % 2 === 0 ? "" : "bg-gray-50/60"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {m.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.memberId} &middot;{" "}
                        {new Date(m.joiningDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${rankColors[m.rank]}`}>
                        {m.rank.replace(/_/g, " ")}
                      </Badge>
                      <span
                        className={`text-xs font-medium ${
                          m.status === "ACTIVE"
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
