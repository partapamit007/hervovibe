"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Wallet, Sparkles, CheckCircle2, TrendingUp } from "lucide-react";

const months    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthsFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

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

interface PreviewMember {
  memberId: string; name: string; memberIdCode: string; rank: string;
  ownSales: number; qualifiesForSalary: boolean;
  greenTeamSize: number; minTeamRequired: number;
  salaryBlocked: boolean; salary: number;
  businessCommission: number; piAmount: number;
  groupVolume: number; alreadyPaid: boolean;
}

interface BiPreviewMember {
  memberId: string; name: string; memberIdCode: string; total: number;
}

interface PayoutRecord {
  id: string; month: number; year: number;
  salaryAmount: number; piAmount: number; biAmount: number; totalAmount: number;
  paymentMode: string | null; transactionRef: string | null; notes: string | null;
  paidAt: string;
  member: { name: string; memberId: string; rank: string; bankAccount?: string; ifscCode?: string; upiId?: string };
}

interface BiPayoutRecord {
  id: string; period: string; fromMonth: number; fromYear: number; toMonth: number; toYear: number;
  amount: number; paymentMode: string | null; transactionRef: string | null; notes: string | null;
  paidAt: string;
  member: { name: string; memberId: string; rank: string };
}

export default function PayoutsPage() {
  const now = new Date();
  const [tab, setTab] = useState<"monthly" | "bi">("monthly");

  // ── MONTHLY TAB ───────────────────────────────────────────────
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()));
  const [payouts,     setPayouts]     = useState<PayoutRecord[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const [preview,     setPreview]     = useState<PreviewMember[] | null>(null);
  const [generating,  setGenerating]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState("");

  // ── BI RELEASE TAB ────────────────────────────────────────────
  const [biFromMonth,  setBiFromMonth]  = useState(String(now.getMonth() + 1));
  const [biFromYear,   setBiFromYear]   = useState(String(now.getFullYear()));
  const [biToMonth,    setBiToMonth]    = useState(String(now.getMonth() + 1));
  const [biToYear,     setBiToYear]     = useState(String(now.getFullYear()));
  const [biPeriodLabel,setBiPeriodLabel]= useState("");
  const [biPreview,    setBiPreview]    = useState<BiPreviewMember[] | null>(null);
  const [biPreviewing, setBiPreviewing] = useState(false);
  const [biReleasing,  setBiReleasing]  = useState(false);
  const [biSaveMsg,    setBiSaveMsg]    = useState("");
  const [biHistory,    setBiHistory]    = useState<BiPayoutRecord[]>([]);
  const [biHistLoading,setBiHistLoading]= useState(false);

  useEffect(() => {
    loadPayouts();
    setPreview(null);
    setSaveMsg("");
  }, [filterMonth, filterYear]);

  useEffect(() => {
    if (tab === "bi") loadBiHistory();
  }, [tab]);

  async function loadPayouts() {
    setPayoutsLoading(true);
    const res = await fetch(`/api/payouts?month=${filterMonth}&year=${filterYear}`);
    const data = await res.json();
    setPayouts(Array.isArray(data) ? data : []);
    setPayoutsLoading(false);
  }

  async function loadBiHistory() {
    setBiHistLoading(true);
    const res = await fetch("/api/payouts/bi");
    const data = await res.json();
    setBiHistory(Array.isArray(data) ? data : []);
    setBiHistLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true); setSaveMsg("");
    const res = await fetch(`/api/payouts/preview?month=${filterMonth}&year=${filterYear}`);
    const data = await res.json();
    if (res.ok) setPreview(data.members ?? []);
    setGenerating(false);
  }

  async function handleSaveAll() {
    if (!preview || preview.length === 0) return;
    setSaving(true); setSaveMsg("");
    let saved = 0, skipped = 0;
    for (const m of preview) {
      if (m.alreadyPaid) { skipped++; continue; }
      const total = m.salary + m.piAmount + m.businessCommission;
      await fetch("/api/payouts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: m.memberId, month: filterMonth, year: filterYear,
          salaryAmount: m.salary,
          piAmount: m.piAmount + m.businessCommission,
          biAmount: 0,
          notes: `Auto: Salary ₹${m.salary} + Commission ₹${m.businessCommission.toFixed(2)} + PI ₹${m.piAmount.toFixed(2)}`,
        }),
      });
      saved++;
    }
    setSaving(false);
    setSaveMsg(`${saved} payouts created${skipped > 0 ? `, ${skipped} skipped (already paid)` : ""}.`);
    setPreview(null);
    loadPayouts();
  }

  async function handleDeletePayout(id: string) {
    if (!confirm("Delete this payout record?")) return;
    await fetch("/api/payouts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPayouts();
  }

  async function handleBiPreview() {
    setBiPreviewing(true); setBiSaveMsg("");
    const res = await fetch(
      `/api/payouts/bi?preview=1&fromMonth=${biFromMonth}&fromYear=${biFromYear}&toMonth=${biToMonth}&toYear=${biToYear}`
    );
    const data = await res.json();
    setBiPreview(data.members ?? []);
    setBiPreviewing(false);
  }

  async function handleBiRelease() {
    if (!biPreview || biPreview.length === 0 || !biPeriodLabel.trim()) return;
    setBiReleasing(true); setBiSaveMsg("");
    const res = await fetch("/api/payouts/bi", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period: biPeriodLabel.trim(),
        fromMonth: biFromMonth, fromYear: biFromYear,
        toMonth: biToMonth, toYear: biToYear,
        members: biPreview.map((m) => ({ memberId: m.memberId, amount: m.total })),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setBiSaveMsg(`${data.created} BI payouts released for "${biPeriodLabel}".`);
      setBiPreview(null);
      setBiPeriodLabel("");
      loadBiHistory();
    }
    setBiReleasing(false);
  }

  async function handleDeleteBi(id: string) {
    if (!confirm("Delete this BI payout record?")) return;
    await fetch("/api/payouts/bi", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadBiHistory();
  }

  function exportCSV() {
    const headers = ["Member ID","Name","Month","Year","Salary","PI+Commission","Total","Mode","Ref","Notes","Paid At"];
    const rows = payouts.map((p) => [
      p.member.memberId, p.member.name, months[p.month - 1], p.year,
      p.salaryAmount, p.piAmount, p.totalAmount,
      p.paymentMode ?? "", p.transactionRef ?? "", p.notes ?? "",
      new Date(p.paidAt).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `payouts-${filterYear}-${filterMonth}.csv`; a.click();
  }

  const totalPaid = payouts.reduce((s, p) => s + p.totalAmount, 0);
  const previewTotal = preview?.reduce((s, m) => m.alreadyPaid ? s : s + m.salary + m.piAmount + m.businessCommission, 0) ?? 0;
  const biPreviewTotal = biPreview?.reduce((s, m) => s + m.total, 0) ?? 0;

  const tabClass = (t: string) =>
    `px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="text-sm text-gray-500">Monthly: Salary + PI + Commission &nbsp;·&nbsp; BI: Released quarterly / half-yearly / yearly by admin</p>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button onClick={() => setTab("monthly")} className={tabClass("monthly")}>Monthly Payouts</button>
        <button onClick={() => setTab("bi")} className={tabClass("bi")}>BI Release</button>
      </div>

      {/* ═══════════════════ MONTHLY TAB ═══════════════════ */}
      {tab === "monthly" && (
        <>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <Button variant="outline" onClick={exportCSV} className="flex items-center gap-1.5 text-sm">
                <Download className="w-4 h-4" /> Export
              </Button>
              <Button onClick={handleGenerate} disabled={generating}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4" />
                {generating ? "Calculating..." : "Generate Payouts"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Disbursed",  value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "text-green-600"  },
              { label: "Members Paid",     value: payouts.length.toString(),                color: "text-blue-600"   },
              { label: "Total Salary",     value: `₹${payouts.reduce((s,p)=>s+p.salaryAmount,0).toLocaleString("en-IN")}`, color: "text-purple-600" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {saveMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{saveMsg}
            </div>
          )}

          {preview && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base">
                    Preview — {monthsFull[parseInt(filterMonth) - 1]} {filterYear}
                    <span className="text-sm font-normal text-gray-500 ml-2">(BI excluded — release separately)</span>
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {preview.filter(m => !m.alreadyPaid).length} pending · ₹{previewTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <Button onClick={handleSaveAll} disabled={saving || preview.filter(m=>!m.alreadyPaid).length===0}
                      className="bg-green-600 hover:bg-green-700 text-sm">
                      {saving ? "Saving..." : "Release Payouts"}
                    </Button>
                    <Button variant="outline" onClick={() => setPreview(null)} className="text-sm">Cancel</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {preview.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No eligible members for this month.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-100">
                          <th className="text-left pb-2 font-medium pr-3">Member</th>
                          <th className="text-right pb-2 font-medium px-2">Own Sales</th>
                          <th className="text-right pb-2 font-medium px-2">Salary</th>
                          <th className="text-right pb-2 font-medium px-2">Commission</th>
                          <th className="text-right pb-2 font-medium px-2">PI</th>
                          <th className="text-right pb-2 font-medium pl-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {preview.map((m) => {
                          const total = m.salary + m.businessCommission + m.piAmount;
                          return (
                            <tr key={m.memberId} className={m.alreadyPaid ? "opacity-40" : ""}>
                              <td className="py-2.5 pr-3">
                                <p className="font-medium text-gray-900 text-xs">{m.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-xs text-gray-400">[{m.memberIdCode}]</span>
                                  <Badge className={`text-xs py-0 ${rankColors[m.rank]}`}>{m.rank.replace(/_/g," ")}</Badge>
                                  {m.alreadyPaid && <span className="text-xs text-green-600">paid</span>}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <span className={`text-xs font-medium ${m.qualifiesForSalary ? "text-green-600" : "text-red-500"}`}>
                                  ₹{m.ownSales.toLocaleString("en-IN")}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right text-xs font-medium">
                                {m.salary > 0
                                  ? <span className="text-gray-800">₹{m.salary.toLocaleString("en-IN")}</span>
                                  : m.salaryBlocked
                                    ? <span className="text-amber-500">Blocked</span>
                                    : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="py-2.5 px-2 text-right text-xs text-blue-700 font-medium">
                                ₹{m.businessCommission.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-2 text-right text-xs text-green-700 font-medium">
                                ₹{m.piAmount.toFixed(2)}
                              </td>
                              <td className="py-2.5 pl-2 text-right text-xs font-bold text-green-700">
                                ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Records — {months[parseInt(filterMonth) - 1]} {filterYear}</CardTitle>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No payout records for this period</p>
                  <p className="text-xs mt-1">Click "Generate Payouts" above to auto-calculate</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payouts.map((p) => (
                    <div key={p.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900">{p.member.name}</p>
                            <span className="text-xs text-gray-400">[{p.member.memberId}]</span>
                            <Badge className={`text-xs ${rankColors[p.member.rank] ?? "bg-gray-100 text-gray-700"}`}>
                              {p.member.rank?.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-1 flex-wrap">
                            {p.salaryAmount > 0 && (
                              <span className="text-xs text-gray-500">Salary: <span className="font-medium text-gray-700">₹{p.salaryAmount.toLocaleString("en-IN")}</span></span>
                            )}
                            {p.piAmount > 0 && (
                              <span className="text-xs text-gray-500">PI+Commission: <span className="font-medium text-gray-700">₹{p.piAmount.toLocaleString("en-IN")}</span></span>
                            )}
                          </div>
                          {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(p.paidAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-base font-bold text-green-600">₹{p.totalAmount.toLocaleString("en-IN")}</span>
                          <button onClick={() => handleDeletePayout(p.id)} className="text-gray-300 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ═══════════════════ BI RELEASE TAB ═══════════════════ */}
      {tab === "bi" && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Release BI Payouts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-gray-500">
                Select the period range, give it a label (e.g. "Q1 2026"), preview accumulated BI per member, then release.
                Preview totals are based on auto-calculated BI commission records from sales — ensure all sales for the period are entered before releasing.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Period Label</label>
                <input
                  type="text"
                  value={biPeriodLabel}
                  onChange={e => setBiPeriodLabel(e.target.value)}
                  placeholder="e.g. Q1 2026 · Jan–Jun 2026 · FY 2025-26"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">From</label>
                  <div className="flex gap-2">
                    <select value={biFromMonth} onChange={e => setBiFromMonth(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select value={biFromYear} onChange={e => setBiFromYear(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">To</label>
                  <div className="flex gap-2">
                    <select value={biToMonth} onChange={e => setBiToMonth(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {months.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select value={biToYear} onChange={e => setBiToYear(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <Button onClick={handleBiPreview} disabled={biPreviewing}
                variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                {biPreviewing ? "Loading..." : "Preview BI Amounts"}
              </Button>
            </CardContent>
          </Card>

          {biSaveMsg && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />{biSaveMsg}
            </div>
          )}

          {biPreview && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base">
                    BI Preview — {biPreview.length} members · ₹{biPreviewTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })} total
                  </CardTitle>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleBiRelease}
                      disabled={biReleasing || biPreview.length === 0 || !biPeriodLabel.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                      {biReleasing ? "Releasing..." : `Release BI — "${biPeriodLabel || 'set label first'}"`}
                    </Button>
                    <Button variant="outline" onClick={() => setBiPreview(null)} className="text-sm">Cancel</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {biPreview.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No BI commissions found for this date range.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {biPreview.map((m) => (
                      <div key={m.memberId} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                          <p className="text-xs text-gray-400">[{m.memberIdCode}]</p>
                        </div>
                        <span className="text-sm font-bold text-purple-700">₹{m.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">BI Payout History</CardTitle></CardHeader>
            <CardContent>
              {biHistLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
              ) : biHistory.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No BI payouts released yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {biHistory.map((p) => (
                    <div key={p.id} className="py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{p.member.name}</p>
                        <p className="text-xs text-gray-500">
                          [{p.member.memberId}] · {p.period}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(p.paidAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold text-purple-700">₹{p.amount.toLocaleString("en-IN")}</span>
                        <button onClick={() => handleDeleteBi(p.id)} className="text-gray-300 hover:text-red-500">
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
