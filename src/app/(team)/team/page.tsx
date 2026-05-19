import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, TrendingUp, CheckCircle } from "lucide-react";

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

export default async function TeamDashboard() {
  const session = await auth();
  const teamMemberId = session?.user?.id;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [memberCount, activeCount, monthSales, recentMembers] = await Promise.all([
    prisma.user.count({
      where: { managedBy: teamMemberId, role: "DISTRIBUTOR" },
    }),
    prisma.user.count({
      where: { managedBy: teamMemberId, role: "DISTRIBUTOR", status: "ACTIVE" },
    }),
    prisma.sale.aggregate({
      where: {
        month,
        year,
        member: { managedBy: teamMemberId },
      },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      where: { managedBy: teamMemberId, role: "DISTRIBUTOR" },
      orderBy: { joiningDate: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        memberId: true,
        rank: true,
        status: true,
      },
    }),
  ]);

  const salesAmount = monthSales._sum.amount ?? 0;

  const stats = [
    {
      label: "My Members",
      value: memberCount,
      icon: Users,
      iconBg: "bg-blue-500",
    },
    {
      label: "Sales This Month",
      value: `₹${salesAmount.toLocaleString("en-IN")}`,
      icon: TrendingUp,
      iconBg: "bg-green-500",
    },
    {
      label: "Active Members",
      value: activeCount,
      icon: CheckCircle,
      iconBg: "bg-purple-500",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Welcome, {session?.user?.name} &mdash;{" "}
          {now.toLocaleString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
              </div>
            </div>
          );
        })}
      </div>

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
              <p className="text-gray-400 text-sm">
                No members assigned to you yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.memberId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs ${rankColors[m.rank] ?? "bg-gray-100 text-gray-700"}`}
                    >
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
  );
}
