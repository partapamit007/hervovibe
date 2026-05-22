"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Trash2, Gift, TrendingUp, IndianRupee } from "lucide-react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface Member { id: string; name: string; memberId: string; }
interface PIEntry { id: string; amount: number; month: number; year: number; notes: string | null; member: { name: string; memberId: string }; }
interface BIEntry { id: string; amount: number; period: string; notes: string | null; member: { name: string; memberId: string }; }
interface PiRate { id: string; month: number; year: number; ratePerPoint: number; }
interface CommissionRecord {
  id: string; type: string; amount: number; depth: number;
  month: number; year: number; fromMemberId: string;
  member: { name: string; memberId: string };
}

const commTypeColor: Record<string, string> = {
  BUSINESS: "bg-blue-100 text-blue-700",
  PI:       "bg-green-100 text-green-700",
  BI:       "bg-purple-100 text-purple-700",
};

export default function IncentivesPage() {
  const now = new Date();
  const [tab, setTab] = useState<"pi" | "bi" | "pirate" | "commissions">("pi");
  const [members, setMembers] = useState<Member[]>([]);
  const [piEntries, setPiEntries] = useState<PIEntry[]>([]);
  const [biEntries, setBiEntries] = useState<BIEntry[]>([]);
  const [piRates, setPiRates] = useState<PiRate[]>([]);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
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

  // PI Rate form
  const [rateMonth, setRateMonth] = useState(String(now.getMonth() + 1));
  const [rateYear, setRateYear] = useState(String(now.getFullYear()));
  const [rateValue, setRateValue] = useState("");

  // Commission filters
  const [commMonth, setCommMonth] = useState(String(now.getMonth() + 1));
  const [commYear, setCommYear] = useState(String(now.getFullYear()));

  useEffect(() => {
    fetch("/api/members?all=1").then((r) => r.json()).then((d) => setMembers(Array.isArray(d) ? d : []));
    loadPI();
    loadBI();
    loadPiRates();
  }, []);

  function loadPI() {
    fetch("/api/incentives/pi").then((r) => r.json()).then((d) => setPiEntries(Array.isArray(d) ? d : []));
  }
  function loadBI() {
    fetch("/api/incentives/bi").then((r) => r.json()).then((d) => setBiEntries(Array.isArray(d) ? d : []));
  }
  function loadPiRates() {
    fetch("/api/pi-rate").then((r) => r.json()).then((d) => setPiRates(Array.isArray(d) ? d : []));
  }
  function loadCommissions(m: string, y: string) {
    fetch(`/api/commissions?month=${m}&year=${y}`)
      .then((r) => r.json())
      .then((d) => setCommissions(Array.isArray(d) ? d : []));
  }

  function showStatus(type: "success" | "error", msg: string) {
    setStatus(type); setStatusMsg(msg);
    setTimeout(() => setStatus("idle"), 5000);
  }

  async function handlePISubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/incentives/pi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: piMember, amount: piAmount, month: piMonth, year: piYear, notes: piNotes }),
      });
      if (res.ok) { showStatus("success", "PI entry recorded."); setPiMember(""); setPiAmount(""); setPiNotes(""); loadPI(); }
      else { const err = await res.json(); showStatus("error", err.error || "Failed"); }
    } catch { showStatus("error", "Network error"); }
    setLoading(false);
  }

  async function handleBISubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/incentives/bi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: biMember, amount: biAmount, period: biPeriod, notes: biNotes }),
      });
      if (res.ok) { showStatus("success", "BI entry recorded."); setBiMember(""); setBiAmount(""); setBiPeriod(""); setBiNotes(""); loadBI(); }
      else { const err = await res.json(); showStatus("error", err.error || "Failed"); }
    } catch { showStatus("error", "Network error"); }
    setLoading(false);
  }

  async function handlePiRateSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/pi-rate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: rateMonth, year: rateYear, ratePerPoint: rateValue }),
      });
      if (res.ok) { showStatus("success", "PI rate saved."); setRateValue(""); loadPiRates(); }
      else { const err = await res.json(); showStatus("error", err.error || "Failed"); }
    } catch { showStatus("error", "Network error"); }
    setLoading(false);
  }

  async function deletePI(id: string) {
    if (!confirm("Delete this PI entry?")) return;
    setDeleting(id);
    await fetch("/api/incentives/pi", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPI(); setDeleting(null);
  }
  async function deleteBI(id: string) {
    if (!confirm("Delete this BI entry?")) return;
    setDeleting(id);
    await fetch("/api/incentives/bi", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadBI(); setDeleting(null);
  }
  async function deletePiRate(id: string) {
    if (!confirm("Delete this rate?")) return;
    setDeleting(id);
    await fetch("/api/pi-rate", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPiRates(); setDeleting(null);
  }

  const tabClass = (t: string) =>
    `px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  // Group commissions by member for display
  const commByMember = commissions.reduce<Record<string, { name: string; memberId: string; business: number; pi: number; bi: number; total: number }>>((acc, c) => {
    if (!acc[c.member.memberId]) acc[c.member.memberId] = { name: c.member.name, memberId: c.member.memberId, business: 0, pi: 0, bi: 0, total: 0 };
    if (c.type === "BUSINESS") acc[c.member.memberId].business += c.amount;
    if (c.type === "PI") acc[c.member.memberId].pi += c.amount;
    if (c.type === "BI") acc[c.member.memberId].bi += c.amount;
    acc[c.member.memberId].total += c.amount;
    return acc;
  }, {});
  const commSummary = Object.values(commByMember).sort((a, b) => b.total - a.total);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incentives</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage PI, BI, PI rates and view auto-commissions</p>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button onClick={() => setTab("pi")} className={tabClass("pi")}>Product Incentive (PI)</button>
        <button onClick={() => setTab("bi")} className={tabClass("bi")}>Business Incentive (BI)</button>
        <button onClick={() => setTab("pirate")} className={tabClass("pirate")}>PI Rate (₹/pt)</button>
        <button onClick={() => { setTab("commissions"); loadCommissions(commMonth, commYear); }} className={tabClass("commissions")}>
          Commissions
        </button>
      </div>

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

      {/* PI TAB */}
      {tab === "pi" && (
        <>
          <Card className="mb-8">
            <CardHeader><CardTitle className="text-base">Add PI Entry</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handlePISubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
                  <select value={piMember} onChange={(e) => setPiMember(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select a member...</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>)}
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
              <CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-green-600" /> PI History</CardTitle>
            </CardHeader>
            <CardContent>
              {piEntries.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No PI entries yet</p> : (
                <div className="divide-y divide-gray-100">
                  {piEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{e.member.name}</p>
                        <p className="text-xs text-gray-500">{e.member.memberId} · {months[e.month - 1]} {e.year}{e.notes && ` · ${e.notes}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-600">₹{e.amount.toLocaleString("en-IN")}</span>
                        <button onClick={() => deletePI(e.id)} disabled={deleting === e.id} className="text-gray-400 hover:text-red-500">
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

      {/* BI TAB */}
      {tab === "bi" && (
        <>
          <Card className="mb-8">
            <CardHeader><CardTitle className="text-base">Add BI Entry</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleBISubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
                  <select value={biMember} onChange={(e) => setBiMember(e.target.value)} required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select a member...</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>)}
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
                    placeholder="e.g. 25% quarterly bonus"
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
              <CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4 text-purple-600" /> BI History</CardTitle>
            </CardHeader>
            <CardContent>
              {biEntries.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No BI entries yet</p> : (
                <div className="divide-y divide-gray-100">
                  {biEntries.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{e.member.name}</p>
                        <p className="text-xs text-gray-500">{e.member.memberId} · {e.period}{e.notes && ` · ${e.notes}`}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-purple-600">₹{e.amount.toLocaleString("en-IN")}</span>
                        <button onClick={() => deleteBI(e.id)} disabled={deleting === e.id} className="text-gray-400 hover:text-red-500">
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

      {/* PI RATE TAB */}
      {tab === "pirate" && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-green-600" /> Set Monthly PI Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-4">
                The PI rate converts accumulated PI points into ₹ payout for each month.
                e.g. if rate = ₹2/pt and a member has 500 points → they earn ₹1,000.
              </p>
              <form onSubmit={handlePiRateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
                    <select value={rateMonth} onChange={(e) => setRateMonth(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                    <select value={rateYear} onChange={(e) => setRateYear(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate (₹ per point)</label>
                  <input type="number" min="0.01" step="0.01" value={rateValue} onChange={(e) => setRateValue(e.target.value)} required
                    placeholder="e.g. 2.00"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                  {loading ? "Saving..." : "Save Rate"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PI Rate History</CardTitle>
            </CardHeader>
            <CardContent>
              {piRates.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No rates set yet</p> : (
                <div className="divide-y divide-gray-100">
                  {piRates.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-3">
                      <p className="text-sm text-gray-800">{months[r.month - 1]} {r.year}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-700">₹{r.ratePerPoint}/pt</span>
                        <button onClick={() => deletePiRate(r.id)} disabled={deleting === r.id} className="text-gray-400 hover:text-red-500">
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

      {/* COMMISSIONS TAB */}
      {tab === "commissions" && (
        <>
          <div className="flex gap-3 mb-5 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select value={commMonth} onChange={(e) => setCommMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select value={commYear} onChange={(e) => setCommYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button variant="outline" onClick={() => loadCommissions(commMonth, commYear)} className="text-sm">
              Load
            </Button>
          </div>

          {commissions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No commissions found for this period</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">{commSummary.length} members earned commissions · {commissions.length} records total</p>
              <Card>
                <CardContent className="pt-4">
                  <div className="divide-y divide-gray-100">
                    {commSummary.map((m) => (
                      <div key={m.memberId} className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.memberId}</p>
                          </div>
                          <span className="text-sm font-bold text-green-700">₹{m.total.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 mt-1.5">
                          {m.business > 0 && (
                            <Badge className="text-xs bg-blue-100 text-blue-700">Business ₹{m.business.toFixed(2)}</Badge>
                          )}
                          {m.pi > 0 && (
                            <Badge className="text-xs bg-green-100 text-green-700">PI ₹{m.pi.toFixed(2)}</Badge>
                          )}
                          {m.bi > 0 && (
                            <Badge className="text-xs bg-purple-100 text-purple-700">BI ₹{m.bi.toFixed(2)}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
