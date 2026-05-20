"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2, Gift } from "lucide-react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface Member { id: string; name: string; memberId: string; }
interface PIEntry { id: string; amount: number; month: number; year: number; notes: string | null; member: { name: string; memberId: string }; createdAt: string; }
interface BIEntry { id: string; amount: number; period: string; notes: string | null; member: { name: string; memberId: string }; createdAt: string; }

export default function IncentivesPage() {
  const now = new Date();
  const [tab, setTab] = useState<"pi" | "bi">("pi");
  const [members, setMembers] = useState<Member[]>([]);
  const [piEntries, setPiEntries] = useState<PIEntry[]>([]);
  const [biEntries, setBiEntries] = useState<BIEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // PI form
  const [piMember, setPiMember] = useState("");
  const [piAmount, setPiAmount] = useState("");
  const [piMonth, setPiMonth] = useState(String(now.getMonth() + 1));
  const [piYear, setPiYear] = useState(String(now.getFullYear()));
  const [piNotes, setPiNotes] = useState("");

  // BI form
  const [biMember, setBiMember] = useState("");
  const [biAmount, setBiAmount] = useState("");
  const [biPeriod, setBiPeriod] = useState("");
  const [biNotes, setBiNotes] = useState("");

  useEffect(() => {
    fetch("/api/members")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : []));
    loadPI();
    loadBI();
  }, []);

  function loadPI() {
    fetch("/api/incentives/pi")
      .then((r) => r.json())
      .then((d) => setPiEntries(Array.isArray(d) ? d : []));
  }

  function loadBI() {
    fetch("/api/incentives/bi")
      .then((r) => r.json())
      .then((d) => setBiEntries(Array.isArray(d) ? d : []));
  }

  function showStatus(type: "success" | "error", msg: string) {
    setStatus(type);
    setStatusMsg(msg);
    setTimeout(() => setStatus("idle"), 5000);
  }

  async function handlePISubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/incentives/pi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: piMember, amount: piAmount, month: piMonth, year: piYear, notes: piNotes }),
      });
      if (res.ok) {
        showStatus("success", "PI entry recorded successfully.");
        setPiMember(""); setPiAmount(""); setPiNotes("");
        loadPI();
      } else {
        const err = await res.json();
        showStatus("error", err.error || "Failed to save PI entry.");
      }
    } catch { showStatus("error", "Network error."); }
    setLoading(false);
  }

  async function handleBISubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/incentives/bi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: biMember, amount: biAmount, period: biPeriod, notes: biNotes }),
      });
      if (res.ok) {
        showStatus("success", "BI entry recorded successfully.");
        setBiMember(""); setBiAmount(""); setBiPeriod(""); setBiNotes("");
        loadBI();
      } else {
        const err = await res.json();
        showStatus("error", err.error || "Failed to save BI entry.");
      }
    } catch { showStatus("error", "Network error."); }
    setLoading(false);
  }

  async function deletePI(id: string) {
    if (!confirm("Delete this PI entry?")) return;
    setDeleting(id);
    await fetch("/api/incentives/pi", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPI();
    setDeleting(null);
  }

  async function deleteBI(id: string) {
    if (!confirm("Delete this BI entry?")) return;
    setDeleting(id);
    await fetch("/api/incentives/bi", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadBI();
    setDeleting(null);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incentives</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage PI (Product) and BI (Business) incentives per member</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setTab("pi")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "pi" ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Product Incentive (PI)
        </button>
        <button
          onClick={() => setTab("bi")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === "bi" ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Business Incentive (BI)
        </button>
      </div>

      {/* Status banner */}
      {status === "success" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-5">
          <CheckCircle className="w-4 h-4 shrink-0" />{statusMsg}
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
          <XCircle className="w-4 h-4 shrink-0" />{statusMsg}
        </div>
      )}

      {/* ── PI TAB ── */}
      {tab === "pi" && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800">Add PI Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePISubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
                  <select value={piMember} onChange={(e) => setPiMember(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select a member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
                  <input type="number" min="0.01" step="0.01" value={piAmount} onChange={(e) => setPiAmount(e.target.value)} required
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
                    <select value={piMonth} onChange={(e) => setPiMonth(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                    <select value={piYear} onChange={(e) => setPiYear(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                  <input type="text" value={piNotes} onChange={(e) => setPiNotes(e.target.value)}
                    placeholder="e.g. 500 units × ₹1.00"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                  {loading ? "Saving..." : "Record PI Entry"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-600" /> PI History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {piEntries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No PI entries yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {piEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.member.name}</p>
                        <p className="text-xs text-gray-500">
                          {entry.member.memberId} · {months[entry.month - 1]} {entry.year}
                          {entry.notes && ` · ${entry.notes}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-600">₹{entry.amount.toLocaleString("en-IN")}</span>
                        <button onClick={() => deletePI(entry.id)} disabled={deleting === entry.id}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── BI TAB ── */}
      {tab === "bi" && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800">Add BI Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBISubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
                  <select value={biMember} onChange={(e) => setBiMember(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select a member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
                  <input type="number" min="1" value={biAmount} onChange={(e) => setBiAmount(e.target.value)} required
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Period</label>
                  <input type="text" value={biPeriod} onChange={(e) => setBiPeriod(e.target.value)} required
                    placeholder="e.g. Q1 2026, Jan–Jun 2026, FY 2026"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                  <input type="text" value={biNotes} onChange={(e) => setBiNotes(e.target.value)}
                    placeholder="e.g. 25% quarterly bonus on ₹40,000 transferred"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                  {loading ? "Saving..." : "Record BI Entry"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-600" /> BI History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {biEntries.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No BI entries yet</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {biEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.member.name}</p>
                        <p className="text-xs text-gray-500">
                          {entry.member.memberId} · {entry.period}
                          {entry.notes && ` · ${entry.notes}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-600">₹{entry.amount.toLocaleString("en-IN")}</span>
                        <button onClick={() => deleteBI(entry.id)} disabled={deleting === entry.id}
                          className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
