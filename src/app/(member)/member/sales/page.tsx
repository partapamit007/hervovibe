export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function MemberSalesPage() {
  const session = await auth();
  if (!session?.user?.id) return <div className="p-8 text-center text-red-500">Session error — please log in again.</div>;
  const userId = session.user.id;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [allSales, thisMonthTotal] = await Promise.all([
    prisma.sale.findMany({
      where: { memberId: userId, deletedAt: null },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.sale.aggregate({
      where: { memberId: userId, month, year, deletedAt: null },
      _sum: { amount: true },
    }),
  ]);

  const currentMonthSales = thisMonthTotal._sum.amount ?? 0;
  const totalEver = allSales.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">My Sales</h1>
        <p className="text-gray-500 text-sm">Your complete sales history</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">This Month</p>
            <p className="text-lg font-bold text-green-600">₹{currentMonthSales.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">All Time Total</p>
            <p className="text-lg font-bold text-gray-800">₹{totalEver.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sales History</CardTitle>
        </CardHeader>
        <CardContent>
          {allSales.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No sales recorded yet</p>
          ) : (
            <div className="space-y-2">
              {allSales.map((s) => (
                <div key={s.id} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{monthNames[s.month - 1]} {s.year}</p>
                    <p className="text-xs text-gray-400">
                      {s.month === month && s.year === year ? "Current month" : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">₹{s.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
