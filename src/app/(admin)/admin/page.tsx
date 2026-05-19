import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const rankColors: Record<string, string> = {
  DISTRIBUTOR:   "bg-gray-100 text-gray-700",
  BRONZE:        "bg-amber-100 text-amber-700",
  SILVER:        "bg-slate-100 text-slate-700",
  SILVER_A:      "bg-slate-200 text-slate-800",
  SILVER_B:      "bg-slate-300 text-slate-900",
  GOLDEN:        "bg-yellow-100 text-yellow-700",
  DIAMOND:       "bg-blue-100 text-blue-700",
  SUPER_DIAMOND: "bg-blue-200 text-blue-800",
  PLATINUM:      "bg-purple-100 text-purple-700",
  CENTENNIAL:    "bg-green-100 text-green-700",
};

export default async function AdminDashboard() {
  const session = await auth();

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [totalMembers, activeMembers, monthlySales, recentSales, recentMembers] = await Promise.all([
    prisma.user.count({ where: { role: "DISTRIBUTOR" } }),
    prisma.user.count({ where: { role: "DISTRIBUTOR", status: "ACTIVE" } }),
    prisma.sale.aggregate({
      _sum: { amount: true },
      where: { month, year },
    }),
    prisma.sale.findMany({
      where: { month, year },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        member: { select: { name: true, memberId: true, rank: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "DISTRIBUTOR" },
      orderBy: { joiningDate: "desc" },
      take: 6,
      select: {
        id: true, name: true, memberId: true, rank: true,
        status: true, joiningDate: true,
      },
    }),
  ]);

  const totalSalesAmount = monthlySales._sum.amount || 0;

  const stats = [
    { label: "Total Members", value: totalMembers.toString(), icon: "👥" },
    { label: "Active Members", value: activeMembers.toString(), icon: "✅" },
    { label: "Total Sales (This Month)", value: `₹${totalSalesAmount.toLocaleString("en-IN")}`, icon: "💰" },
    { label: "Inactive / At Risk", value: (totalMembers - activeMembers).toString(), icon: "⚠️" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome back, {session?.user?.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sales — {new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No sales entries yet</p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.member.name}</p>
                      <p className="text-xs text-gray-500">{s.member.memberId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${rankColors[s.member.rank]}`}>{s.member.rank.replace(/_/g, " ")}</Badge>
                      <span className="text-sm font-bold text-green-600">₹{s.amount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Members</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMembers.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No members yet</p>
            ) : (
              <div className="space-y-3">
                {recentMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-500">
                        {m.memberId} · Joined {new Date(m.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${rankColors[m.rank]}`}>{m.rank.replace(/_/g, " ")}</Badge>
                      <span className={`text-xs font-medium ${m.status === "ACTIVE" ? "text-green-600" : "text-red-500"}`}>{m.status}</span>
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
