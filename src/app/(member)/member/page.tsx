import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";

export default async function MemberDashboard() {
  const session = await auth();

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">Hi, {session?.user?.name?.split(" ")[0]} 👋</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge className="bg-green-100 text-green-700 text-xs">{session?.user?.rank}</Badge>
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
            <span className="text-xl font-bold text-gray-800">₹—</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Monthly Target</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">₹—</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Salary</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">₹—</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs text-gray-500">Team Size</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <span className="text-xl font-bold text-gray-800">—</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm text-center py-6">No sales recorded yet</p>
        </CardContent>
      </Card>
    </div>
  );
}
