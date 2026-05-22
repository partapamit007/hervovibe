"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Wallet, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthsFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
  memberId: string;
  name: string;
  memberIdCode: string;
  rank: string;
  ownSales: number;
  qualifiesForSalary: boolean;
  belowMinDownline: number;
  salaryBlocked: boolean;
  salary: number;
  businessCommission: number;
  piPoints: number;
  piRatePerPoint: number;
  piAmount: number;
  groupVolume: number;
  alreadyPaid: boolean;
}

export default function PayoutsPage() {
  const now = new Date();
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()));
  const [payouts,     setPayouts]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);

  // Smart generate state
  const [preview,      setPreview]      = useState<PreviewMember[] | null>(null);
  const [piRateSet,    setPiRateSet]    = useState(true);
  const [biOverrides,  setBiOverrides]  = useState<Record<string, string>>({});
  const [generating,   setGenerating]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState("");

  useEffect(() => { loadPayouts(); setPreview(null); setBiOverrides({}); setSaveMsg(""); }, [filterMonth, filterYear]);

  async function loadPayouts() {
    setLoading(true);
    const res = await fetch(`/api/payouts?month=${filterMonth}&year=${filterYear}`);
    const data = await res.json();
    setPayouts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setSaveMsg("");
    const res = await fetch(`/api/payouts/preview?month=${filterMonth}&year=${filterYear}`);
    const data = await res.json();
    if (res.ok) {
      setPreview(data.members ?? []);
      setPiRateSet(data.piRateSet);
      const overrides: Record<string, string> = {};
      (data.members ?? []).forEach((m: PreviewMember) => { overrides[m.memberId] = "0"; });
      setBiOverrides(overrides);
    }
    setGenerating(false);
  }

  async function handleSaveAll() {
    if (!preview || preview.length === 0) return;
    setSaving(true);
    setSaveMsg("");
    let saved = 0;
    let skipped = 0;
    for (const m of preview) {
      if (m.alreadyPaid) { skipped++; continue; }
      const bi       = parseFloat(biOverrides[m.memberId] || "0");
      const salary   = m.salary;
      const pi       = m.piAmount;
      const business = m.businessCommission;
      const total    = salary + pi + business + bi;
      await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: m.memberId,
          month: filterMonth,
          year: filterYear,
          salaryAmount:  salary,
          piAmount:      pi + business,
          biAmount:      bi,
          notes: `Auto: Salary ₹${salary} + Commission ₹${business.toFixed(2)} + PI ₹${pi.toFixed(2)} + BI ₹${bi}`,
        }),
      });
      saved++;
    }
    setSaving(false);
    setSaveMsg(`${saved} payouts created${skipped > 0 ? `, ${skipped} skipped (already paid)` : ""}.`);
    setPreview(null);
    loadPayouts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payout record?")) return;
    await fetch("/api/payouts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPayouts();
  }

  function exportCSV() {
    const headers = ["Member ID","Name","Month","Year","Salary","PI+Commission","BI","Total","Mode","Ref","Notes","Paid At"];
    const rows = payouts.map((p: any) => [
      p.member.memberId, p.member.name,
      months[p.month - 1], p.year,
      p.salaryAmount, p.piAmount, p.biAmount, p.totalAmount,
      p.paymentMode ?? "", p.transactionRef ?? "", p.notes ?? "",
      new Date(p.paidAt).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payouts-${filterYear}-${filterMonth}.csv`;
    a.click();
  }

  const totalPaid  = payouts.reduce((s: number, p: any) => s + p.totalAmount, 0);
  const previewTotal = preview?.reduce((s, m) => {
    if (m.alreadyPaid) return s;
    return s + m.salary + m.piAmount + m.businessCommission + parseFloat(biOverrides[m.memberId] || "0");
  }, 0) ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-sm text-gray-500">Auto-calculate and disburse salary + commissions</p>
        </div>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Disbursed",  value: `₹${totalPaid.toLocaleString("en-IN")}`,                                                                                      color: "text-green-600"  },
          { label: "Records",          value: payouts.length.toString(),                                                                                                     color: "text-blue-600"   },
          { label: "Total Salary",     value: `₹${payouts.reduce((s:number,p:any)=>s+p.salaryAmount,0).toLocaleString("en-IN")}`,                                            color: "text-purple-600" },
          { label: "Total Commission", value: `₹${payouts.reduce((s:number,p:any)=>s+p.piAmount,0).toLocaleString("en-IN")}`,                                                color: "text-amber-600"  },
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

      {/* Smart Preview Table */}
      {preview && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base font-semibold text-gray-800">
                Payout Preview — {monthsFull[parseInt(filterMonth) - 1]} {filterYear}
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {preview.filter(m => !m.alreadyPaid).length} pending · ₹{previewTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })} total
                </span>
                <Button onClick={handleSaveAll} disabled={saving || preview.filter(m=>!m.alreadyPaid).length===0}
                  className="bg-green-600 hover:bg-green-700 text-sm">
                  {saving ? "Saving..." : "Create All Payouts"}
                </Button>
                <Button variant="outline" onClick={() => setPreview(null)} className="text-sm">Cancel</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!piRateSet && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                PI rate not set for this month — PI amounts will be ₹0. Set it in Incentives → PI Rate.
              </div>
            )}
            {preview.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No eligible members found for this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium pr-3">Member</th>
                      <th className="text-right pb-2 font-medium px-2">Own Sales</th>
                      <th className="text-right pb-2 font-medium px-2">Salary</th>
                      <th className="text-right pb-2 font-medium px-2">Commission</th>
                      <th className="text-right pb-2 font-medium px-2">PI (₹)</th>
                      <th className="text-right pb-2 font-medium px-2">Group Vol.</th>
                      <th className="text-right pb-2 font-medium px-2">BI (enter)</th>
                      <th className="text-right pb-2 font-medium pl-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.map((m) => {
                      const bi    = parseFloat(biOverrides[m.memberId] || "0");
                      const total = m.salary + m.businessCommission + m.piAmount + bi;
                      return (
                        <tr key={m.memberId} className={m.alreadyPaid ? "opacity-40" : ""}>
                          <td className="py-2.5 pr-3">
                            <p className="font-medium text-gray-900 text-xs">{m.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge className={`text-xs py-0 ${rankColors[m.rank]}`}>{m.rank.replace(/_/g," ")}</Badge>
                              {m.alreadyPaid && <span className="text-xs text-green-600">paid</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className={`text-xs font-medium ${m.qualifiesForSalary ? "text-green-600" : "text-red-500"}`}>
                              ₹{m.ownSales.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs font-medium text-gray-800">
                            {m.salary > 0
                              ? `₹${m.salary.toLocaleString("en-IN")}`
                              : m.salaryBlocked && m.belowMinDownline > 0
                                ? <span className="text-red-500" title={`${m.belowMinDownline} downline member(s) below ₹1,800`}>Blocked ({m.belowMinDownline}⚠)</span>
                                : m.salaryBlocked
                                  ? <span className="text-amber-500">Own &lt; ₹1,800</span>
                                  : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs text-blue-700 font-medium">
                            ₹{m.businessCommission.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs text-green-700 font-medium">
                            {m.piRatePerPoint > 0
                              ? `₹${m.piAmount.toFixed(2)}`
                              : <span className="text-gray-400">{m.piPoints.toFixed(1)}pts</span>}
                          </td>
                          <td className="py-2.5 px-2 text-right text-xs text-purple-700 font-medium">
                            ₹{m.groupVolume.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number" min="0" step="1"
                              value={biOverrides[m.memberId] ?? "0"}
                              disabled={m.alreadyPaid}
                              onChange={e => setBiOverrides(prev => ({ ...prev, [m.memberId]: e.target.value }))}
                              className="w-20 text-right px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
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

      {/* Payout Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800">
            Records — {months[parseInt(filterMonth) - 1]} {filterYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payout records for this period</p>
              <p className="text-xs mt-1">Click "Generate Payouts" above to auto-calculate</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {payouts.map((p: any) => (
                <div key={p.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{p.member.name}</p>
                        <span className="text-xs text-gray-400">{p.member.memberId}</span>
                        <Badge className={`text-xs ${rankColors[p.member.rank] ?? "bg-gray-100 text-gray-700"}`}>
                          {p.member.rank?.replace(/_/g, " ")}
                        </Badge>
                        {p.paymentMode && (
                          <Badge className="text-xs bg-blue-50 text-blue-700">{p.paymentMode.replace(/_/g," ")}</Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 flex-wrap">
                        {p.salaryAmount > 0 && (
                          <span className="text-xs text-gray-500">Salary: <span className="font-medium text-gray-700">₹{p.salaryAmount.toLocaleString("en-IN")}</span></span>
                        )}
                        {p.piAmount > 0 && (
                          <span className="text-xs text-gray-500">Commission+PI: <span className="font-medium text-gray-700">₹{p.piAmount.toLocaleString("en-IN")}</span></span>
                        )}
                        {p.biAmount > 0 && (
                          <span className="text-xs text-gray-500">BI: <span className="font-medium text-gray-700">₹{p.biAmount.toLocaleString("en-IN")}</span></span>
                        )}
                        {p.transactionRef && (
                          <span className="text-xs text-gray-500">Ref: <span className="font-medium">{p.transactionRef}</span></span>
                        )}
                      </div>
                      {p.notes && <p className="text-xs text-gray-400 mt-0.5">{p.notes}</p>}
                      {p.member.bankAccount && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Bank: {p.member.bankAccount} · IFSC: {p.member.ifscCode || "—"}
                          {p.member.upiId && ` · UPI: ${p.member.upiId}`}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(p.paidAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base font-bold text-green-600">₹{p.totalAmount.toLocaleString("en-IN")}</span>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
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
    </div>
  );
}
