"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, Trash2, Wallet } from "lucide-react";

const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function PayoutsPage() {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()));
  const [payouts,  setPayouts]  = useState<any[]>([]);
  const [members,  setMembers]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    memberId: "", salaryAmount: "", piAmount: "", biAmount: "",
    paymentMode: "", transactionRef: "", notes: "",
  });

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  useEffect(() => { loadPayouts(); }, [filterMonth, filterYear]);
  useEffect(() => {
    fetch("/api/members?all=1").then(r => r.json()).then(d => setMembers(Array.isArray(d) ? d : []));
  }, []);

  async function loadPayouts() {
    setLoading(true);
    const params = new URLSearchParams({ month: filterMonth, year: filterYear });
    const res = await fetch(`/api/payouts?${params}`);
    const data = await res.json();
    setPayouts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, month: filterMonth, year: filterYear }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ memberId: "", salaryAmount: "", piAmount: "", biAmount: "", paymentMode: "", transactionRef: "", notes: "" });
    loadPayouts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payout record?")) return;
    await fetch("/api/payouts", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPayouts();
  }

  function exportCSV() {
    const headers = ["Member ID","Name","Month","Year","Salary","PI","BI","Total","Mode","Ref","Notes","Paid At"];
    const rows = payouts.map((p: any) => [
      p.member.memberId, p.member.name,
      months[p.month - 1], p.year,
      p.salaryAmount, p.piAmount, p.biAmount, p.totalAmount,
      p.paymentMode ?? "", p.transactionRef ?? "", p.notes ?? "",
      new Date(p.paidAt).toLocaleDateString("en-IN"),
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `payouts-${filterYear}-${filterMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const totalPaid = payouts.reduce((s: number, p: any) => s + p.totalAmount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-sm text-gray-500">Record salary, PI and BI disbursements</p>
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
          <Button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> Add Payout
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Disbursed",   value: `₹${totalPaid.toLocaleString("en-IN")}`,    color: "text-green-600" },
          { label: "Records",           value: payouts.length.toString(),                   color: "text-blue-600"  },
          { label: "Total Salary",      value: `₹${payouts.reduce((s:number,p:any)=>s+p.salaryAmount,0).toLocaleString("en-IN")}`, color: "text-purple-600" },
          { label: "Total PI + BI",     value: `₹${payouts.reduce((s:number,p:any)=>s+p.piAmount+p.biAmount,0).toLocaleString("en-IN")}`, color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Payout Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-600" />
              New Payout — {months[parseInt(filterMonth) - 1]} {filterYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
                <select required value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select member...</option>
                  {members.map((m: any) => <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { field: "salaryAmount", label: "Salary (₹)" },
                  { field: "piAmount",     label: "PI (₹)" },
                  { field: "biAmount",     label: "BI (₹)" },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input type="number" min="0" step="0.01" value={(form as any)[field]}
                      onChange={e => setForm({ ...form, [field]: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                ))}
              </div>
              {(form.salaryAmount || form.piAmount || form.biAmount) && (
                <p className="text-sm text-green-700 font-medium bg-green-50 px-3 py-2 rounded-lg">
                  Total: ₹{(parseFloat(form.salaryAmount||"0") + parseFloat(form.piAmount||"0") + parseFloat(form.biAmount||"0")).toLocaleString("en-IN")}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select...</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Ref</label>
                  <input type="text" value={form.transactionRef}
                    onChange={e => setForm({ ...form, transactionRef: e.target.value })}
                    placeholder="UTR / Cheque No."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving..." : "Save Payout"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
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
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No payout records for this period</p>
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
                        {p.paymentMode && (
                          <Badge className="text-xs bg-blue-50 text-blue-700">{p.paymentMode.replace(/_/g, " ")}</Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 flex-wrap">
                        {p.salaryAmount > 0 && (
                          <span className="text-xs text-gray-500">Salary: <span className="font-medium text-gray-700">₹{p.salaryAmount.toLocaleString("en-IN")}</span></span>
                        )}
                        {p.piAmount > 0 && (
                          <span className="text-xs text-gray-500">PI: <span className="font-medium text-gray-700">₹{p.piAmount.toLocaleString("en-IN")}</span></span>
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
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Paid: {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-base font-bold text-green-600">₹{p.totalAmount.toLocaleString("en-IN")}</span>
                      <button onClick={() => handleDelete(p.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors">
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
