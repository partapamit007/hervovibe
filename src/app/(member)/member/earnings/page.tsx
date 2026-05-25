export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default async function EarningsPage() {
  const session = await auth();
  if (!session?.user?.id) return <div className="p-8 text-center text-red-500">Session error — please log in again.</div>;
  const userId = session.user.id;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  // Build last 12 months for commission history
  const historyMonths: { month: number; year: number }[] = [];
  for (let i = 0; i < 12; i++) {
    let m = month - i; let y = year;
    if (m <= 0) { m += 12; y--; }
    historyMonths.push({ month: m, year: y });
  }

  const [thisMonthComm, payouts, piRate, allComm] = await Promise.all([
    prisma.commissionRecord.findMany({ where: { memberId: userId, month, year } }),
    prisma.payoutRecord.findMany({
      where: { memberId: userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.piRate.findUnique({ where: { month_year: { month, year } } }),
    prisma.commissionRecord.findMany({
      where: { memberId: userId, OR: historyMonths },
      select: { month: true, year: true, type: true, amount: true },
    }),
  ]);

  // This month breakdown
  const bizComm  = thisMonthComm.filter(c => c.type === "BUSINESS").reduce((s, c) => s + c.amount, 0);
  const piPoints = thisMonthComm.filter(c => c.type === "PI").reduce((s, c) => s + c.amount, 0);
  const piAmount = piRate ? piPoints * piRate.ratePerPoint : 0;

  // Group commission history by month
  type MonthSummary = { business: number; pi: number; piAmount: number; piRate: number };
  const byMonth = new Map<string, MonthSummary>();
  for (const c of allComm) {
    const key = `${c.year}-${c.month}`;
    if (!byMonth.has(key)) byMonth.set(key, { business: 0, pi: 0, piAmount: 0, piRate: 0 });
    const rec = byMonth.get(key)!;
    if (c.type === "BUSINESS") rec.business += c.amount;
    if (c.type === "PI")       rec.pi       += c.amount;
  }

  // Attach PI rates to history (fetch all relevant pi rates)
  const piRates = await prisma.piRate.findMany({
    where: { OR: historyMonths },
    select: { month: true, year: true, ratePerPoint: true },
  });
  const piRateMap = new Map(piRates.map(r => [`${r.year}-${r.month}`, r.ratePerPoint]));
  for (const [key, rec] of byMonth) {
    const rate = piRateMap.get(key) ?? 0;
    rec.piRate   = rate;
    rec.piAmount = parseFloat((rec.pi * rate).toFixed(2));
  }

  // Total lifetime paid
  const totalPaid = payouts.reduce((s, p) => s + p.totalAmount, 0);

  return (
    <div className="max-w-lg mx-auto px-4 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-4 pt-2">My Earnings</h1>

      {/* This month summary */}
      <Card className="mb-4">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm text-gray-700">
            This Month — {monthNames[month - 1]} {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {bizComm > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Business Commission</span>
              <span className="font-medium text-blue-700">₹{bizComm.toFixed(2)}</span>
            </div>
          )}
          {piPoints > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                PI Points ({piPoints.toFixed(1)} pts{piRate ? ` × ₹${piRate.ratePerPoint}` : ""})
              </span>
              <span className="font-medium text-green-700">
                {piRate ? `₹${piAmount.toFixed(2)}` : `${piPoints.toFixed(1)} pts`}
              </span>
            </div>
          )}
          {bizComm === 0 && piPoints === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">
              No commissions recorded this month yet
            </p>
          )}
          {(bizComm > 0 || piPoints > 0) && (
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2 font-semibold">
              <span className="text-gray-700">Total Earned</span>
              <span className="text-green-700">₹{(bizComm + piAmount).toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission history by month */}
      <Card className="mb-4">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm text-gray-700">Commission History</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {historyMonths.length === 0 || byMonth.size === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No commission records yet</p>
          ) : (
            <div className="space-y-2">
              {historyMonths.map(({ month: m, year: y }) => {
                const key = `${y}-${m}`;
                const rec = byMonth.get(key);
                if (!rec || (rec.business === 0 && rec.pi === 0)) return null;
                const total = rec.business + rec.piAmount;
                return (
                  <div key={key} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{monthNames[m - 1]} {y}</span>
                      <span className="text-sm font-bold text-green-700">₹{total.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-400">
                      {rec.business > 0 && <span>Business: ₹{rec.business.toFixed(2)}</span>}
                      {rec.pi > 0 && (
                        <span>
                          PI: {rec.pi.toFixed(1)} pts
                          {rec.piRate > 0 ? ` = ₹${rec.piAmount.toFixed(2)}` : " (rate pending)"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout records */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-700">Payout History</CardTitle>
            {totalPaid > 0 && (
              <span className="text-xs font-semibold text-green-700">
                Total received: {fmt(totalPaid)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No payouts disbursed yet</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((p) => (
                <div key={p.id} className="py-2 border-b border-gray-100 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {monthNames[p.month - 1]} {p.year}
                    </span>
                    <span className="text-sm font-bold text-green-700">{fmt(p.totalAmount)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                    {p.salaryAmount > 0 && <span>Salary: {fmt(p.salaryAmount)}</span>}
                    {p.piAmount > 0     && <span>PI: {fmt(p.piAmount)}</span>}
                    {p.biAmount > 0     && <span>BI: {fmt(p.biAmount)}</span>}
                    {p.paymentMode && (
                      <Badge className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0">
                        {p.paymentMode}
                      </Badge>
                    )}
                  </div>
                  {p.transactionRef && (
                    <p className="text-xs text-gray-400 mt-0.5">Ref: {p.transactionRef}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
