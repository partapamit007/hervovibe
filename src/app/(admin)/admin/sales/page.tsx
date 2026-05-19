"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle, XCircle } from "lucide-react";

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

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface Member {
  id: string;
  name: string;
  memberId: string;
  rank: string;
}

interface Sale {
  id: string;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  member: { name: string; memberId: string; rank: string };
}

export default function AdminSalesPage() {
  const now = new Date();
  const [members, setMembers] = useState<Member[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  // Form state
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []));
    loadSales();
  }, []);

  function loadSales() {
    fetch("/api/sales")
      .then((r) => r.json())
      .then((d) => setSales(Array.isArray(d) ? d : []));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, amount, month, year }),
      });

      if (res.ok) {
        setStatus("success");
        const member = members.find((m) => m.id === memberId);
        setStatusMsg(
          `Sale of ₹${parseInt(amount).toLocaleString("en-IN")} recorded for ${member?.name ?? "member"}.`
        );
        setMemberId("");
        setAmount("");
        setMonth(String(now.getMonth() + 1));
        setYear(String(now.getFullYear()));
        loadSales();
      } else {
        const err = await res.json();
        setStatus("error");
        setStatusMsg(err.error || "Failed to record sale.");
      }
    } catch {
      setStatus("error");
      setStatusMsg("Network error. Please try again.");
    }
    setLoading(false);
    setTimeout(() => setStatus("idle"), 5000);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Record member sales entries
        </p>
      </div>

      {/* Sale Entry Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800">
            New Sale Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "success" && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {statusMsg}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              <XCircle className="w-4 h-4 shrink-0" />
              {statusMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Member
              </label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select a member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.memberId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g. 5000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {months.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? "Saving..." : "Record Sale"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No sales recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sales.map((s, i) => (
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
                    <p className="text-xs text-gray-500">
                      {s.member.memberId} &middot; {months[s.month - 1]} {s.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-xs ${rankColors[s.member.rank] ?? "bg-gray-100 text-gray-700"}`}
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
    </div>
  );
}
