"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, PlayCircle, CheckCircle, XCircle, ArrowUp, ArrowDown } from "lucide-react";

const RANK_ORDER = ["DISTRIBUTOR","BRONZE","SILVER","GOLDEN","DIAMOND","SUPER_DIAMOND","PLATINUM","CENTENNIAL"];
const RANK_MIN_TEAM: Record<string, number> = {
  DISTRIBUTOR: 0, BRONZE: 5, SILVER: 25, GOLDEN: 125,
  DIAMOND: 625, SUPER_DIAMOND: 3125, PLATINUM: 15625, CENTENNIAL: 78125,
};
const RANK_SALARY: Record<string, string> = {
  DISTRIBUTOR: "—", BRONZE: "—", SILVER: "₹1,000", GOLDEN: "₹5,000",
  DIAMOND: "₹15,000", SUPER_DIAMOND: "₹30,000", PLATINUM: "₹75,000", CENTENNIAL: "₹1,00,000",
};
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

interface HistoryEntry {
  id: string;
  oldRank: string;
  newRank: string;
  month: number;
  year: number;
  reason: string | null;
  createdAt: string;
  member: { name: string; memberId: string };
}

interface RunResult {
  processed: number;
  changed: number;
  changes: { memberId: string; oldRank: string; newRank: string; teamSize: number }[];
}

export default function RanksPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    const res = await fetch("/api/admin/rank-engine");
    const data = await res.json();
    setHistory(Array.isArray(data) ? data : []);
  }

  async function handleRun() {
    if (!confirm(`Run rank engine for ${months[parseInt(month) - 1]} ${year}? This will upgrade/downgrade member ranks based on team size.`)) return;
    setRunning(true);
    setResult(null);
    setRunError("");
    try {
      const res = await fetch("/api/admin/rank-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        loadHistory();
      } else {
        setRunError(data.error || "Failed to run rank engine");
      }
    } catch {
      setRunError("Network error");
    }
    setRunning(false);
  }

  const isUpgrade = (oldRank: string, newRank: string) =>
    RANK_ORDER.indexOf(newRank) > RANK_ORDER.indexOf(oldRank);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rank Engine</h1>
        <p className="text-sm text-gray-500 mt-0.5">Auto-calculate and upgrade/downgrade member ranks based on team size</p>
      </div>

      {/* Rank Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Rank Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Rank</th>
                  <th className="text-right pb-2 font-medium">Min Team</th>
                  <th className="text-right pb-2 font-medium">Monthly Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {RANK_ORDER.map((r) => (
                  <tr key={r}>
                    <td className="py-2">
                      <Badge className={`text-xs ${rankColors[r]}`}>{r.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {RANK_MIN_TEAM[r] === 0 ? "—" : RANK_MIN_TEAM[r].toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-800">{RANK_SALARY[r]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Own monthly purchase ≥ ₹1,800 required to earn salary and commissions.
          </p>
        </CardContent>
      </Card>

      {/* Run Engine */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">Run Rank Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <Button onClick={handleRun} disabled={running} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <PlayCircle className="w-4 h-4" />
            {running ? "Running..." : "Run Rank Engine"}
          </Button>

          {runError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <XCircle className="w-4 h-4 shrink-0" />{runError}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-green-700 text-sm font-semibold mb-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Done — {result.processed} members processed, {result.changed} rank changes
              </div>
              {result.changes.length > 0 && (
                <div className="space-y-1 mt-2">
                  {result.changes.map((c) => (
                    <div key={c.memberId} className="flex items-center gap-2 text-xs text-gray-700">
                      {isUpgrade(c.oldRank, c.newRank)
                        ? <ArrowUp className="w-3 h-3 text-green-600 shrink-0" />
                        : <ArrowDown className="w-3 h-3 text-red-500 shrink-0" />}
                      <Badge className={`text-xs ${rankColors[c.oldRank]}`}>{c.oldRank.replace(/_/g, " ")}</Badge>
                      <span className="text-gray-400">→</span>
                      <Badge className={`text-xs ${rankColors[c.newRank]}`}>{c.newRank.replace(/_/g, " ")}</Badge>
                      <span className="text-gray-500">(team: {c.teamSize})</span>
                    </div>
                  ))}
                </div>
              )}
              {result.changes.length === 0 && (
                <p className="text-xs text-gray-500">No rank changes — all members are at the correct rank.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" /> Rank Change History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No rank changes recorded yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((h) => (
                <div key={h.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{h.member.name}</p>
                    <p className="text-xs text-gray-500">{h.member.memberId} · {months[h.month - 1]} {h.year}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isUpgrade(h.oldRank, h.newRank)
                      ? <ArrowUp className="w-3.5 h-3.5 text-green-600" />
                      : <ArrowDown className="w-3.5 h-3.5 text-red-500" />}
                    <Badge className={`text-xs ${rankColors[h.oldRank]}`}>{h.oldRank.replace(/_/g, " ")}</Badge>
                    <span className="text-xs text-gray-400">→</span>
                    <Badge className={`text-xs ${rankColors[h.newRank]}`}>{h.newRank.replace(/_/g, " ")}</Badge>
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
