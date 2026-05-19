import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function TeamDashboard() {
  const session = await auth();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Team Dashboard</h1>
        <p className="text-gray-500 text-sm">Welcome, {session?.user?.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">My Members</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-gray-800">—</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Sales This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-gray-800">₹—</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-gray-800">—</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
        </CardContent>
      </Card>
    </div>
  );
}
