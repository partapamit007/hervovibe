import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function AdminDashboard() {
  const session = await auth();

  const stats = [
    { label: "Total Members", value: "—", icon: "👥" },
    { label: "Active Members", value: "—", icon: "✅" },
    { label: "Total Sales (This Month)", value: "₹—", icon: "💰" },
    { label: "Pending Rank Reviews", value: "—", icon: "🏆" },
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
            <CardTitle className="text-base">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm text-center py-8">No sales entries yet</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm text-center py-8">No members yet</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
