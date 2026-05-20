"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const RANK_COLORS: Record<string, string> = {
  DISTRIBUTOR:   "#9ca3af",
  BRONZE:        "#f59e0b",
  SILVER:        "#94a3b8",
  GOLDEN:        "#eab308",
  DIAMOND:       "#3b82f6",
  SUPER_DIAMOND: "#1d4ed8",
  PLATINUM:      "#a855f7",
  CENTENNIAL:    "#22c55e",
};

export default function ReportsPage() {
  const now = new Date();
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()));
  const [filterMonth, setFilterMonth] = useState("");
  const [salesData,   setSalesData]   = useState<any[]>([]);
  const [members,     setMembers]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => { loadData(); }, [filterYear, filterMonth]);

  async function loadData() {
    setLoading(true);
    const salesParams = new URLSearchParams({ year: filterYear });
    if (filterMonth) salesParams.set("month", filterMonth);

    const [salesRes, membersRes] = await Promise.all([
      fetch(`/api/sales?${salesParams}`),
      fetch("/api/members?all=1"),
    ]);
    const [sales, membersData] = await Promise.all([salesRes.json(), membersRes.json()]);
    setSalesData(Array.isArray(sales) ? sales : []);
    setMembers(Array.isArray(membersData) ? membersData : []);
    setLoading(false);
  }

  const monthlyTotals = months.map((name, i) => ({
    month: name,
    total: salesData.filter((s: any) => s.month === i + 1).reduce((sum: number, s: any) => sum + s.amount, 0),
  }));

  const rankCounts = members.reduce((acc: Record<string, number>, m: any) => {
    acc[m.rank] = (acc[m.rank] || 0) + 1;
    return acc;
  }, {});
  const rankPieData = Object.entries(rankCounts).map(([rank, count]) => ({
    name: rank.replace(/_/g, " "),
    value: count,
    color: RANK_COLORS[rank] || "#9ca3af",
  }));

  const memberTotals = salesData.reduce((acc: Record<string, { name: string; amount: number }>, s: any) => {
    const key = s.member?.memberId || "";
    if (!acc[key]) acc[key] = { name: s.member?.name || key, amount: 0 };
    acc[key].amount += s.amount;
    return acc;
  }, {});
  const topEarners = Object.entries(memberTotals)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 10);

  const totalSales  = salesData.reduce((s: number, e: any) => s + e.amount, 0);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  function exportSales() {
    const params = new URLSearchParams();
    if (filterMonth) { params.set("month", filterMonth); params.set("year", filterYear); }
    window.location.href = `/api/export/sales?${params}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Sales analytics and member insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="">All Months</option>
            {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" onClick={exportSales} className="flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Sales",    value: `₹${totalSales.toLocaleString("en-IN")}`, color: "text-green-600" },
          { label: "Transactions",   value: salesData.length.toString(),              color: "text-blue-600"  },
          { label: "Total Members",  value: members.length.toString(),                color: "text-purple-600"},
          { label: "Avg per Member", value: members.length ? `₹${Math.round(totalSales / members.length).toLocaleString("en-IN")}` : "₹0", color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading charts...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" /> Monthly Sales — {filterYear}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyTotals} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 100000 ? `₹${(v/100000).toFixed(0)}L` : `₹${(v/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Sales"]} />
                    <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" /> Members by Rank
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={rankPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                      label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                      {rankPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {topEarners.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-800">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {topEarners.map(([memberId, data], i) => (
                    <div key={memberId} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? "bg-yellow-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-700" : "bg-gray-200 text-gray-600"}`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{data.name}</p>
                          <p className="text-xs text-gray-500">{memberId}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600">₹{data.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
