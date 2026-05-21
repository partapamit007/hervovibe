"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle, XCircle, Trash2, ExternalLink, ImagePlus, X } from "lucide-react";

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

interface Member { id: string; name: string; memberId: string; rank: string; }
interface Sale {
  id: string; amount: number; month: number; year: number; invoiceUrl: string | null;
  notes: string | null; createdAt: string;
  member: { name: string; memberId: string; rank: string };
  enteredBy: { name: string };
}

export default function AdminSalesPage() {
  const now = new Date();
  const fileRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Form
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [notes, setNotes] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [invoicePreview, setInvoicePreview] = useState("");

  useEffect(() => {
    fetch("/api/members?all=1").then((r) => r.json()).then((d) => setMembers(Array.isArray(d) ? d : []));
    loadSales();
  }, []);

  function loadSales(m?: string, y?: string) {
    const params = new URLSearchParams();
    if (m) params.set("month", m);
    if (y) params.set("year", y);
    fetch("/api/sales?" + params.toString()).then((r) => r.json()).then((d) => setSales(Array.isArray(d) ? d : []));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        setInvoiceUrl(url);
        setInvoicePreview(URL.createObjectURL(file));
      } else {
        setStatus("error");
        setStatusMsg("Invoice upload failed. Check Cloudinary config.");
        setTimeout(() => setStatus("idle"), 5000);
      }
    } catch { /* ignore */ }
    setUploading(false);
  }

  function clearInvoice() {
    setInvoiceUrl("");
    setInvoicePreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, amount, month, year, invoiceUrl, notes }),
      });
      if (res.ok) {
        const member = members.find((m) => m.id === memberId);
        setStatus("success");
        setStatusMsg(`Sale of ₹${parseInt(amount).toLocaleString("en-IN")} recorded for ${member?.name ?? "member"}.`);
        setMemberId(""); setAmount(""); setNotes("");
        clearInvoice();
        loadSales(filterMonth, filterYear);
      } else {
        const err = await res.json();
        setStatus("error");
        setStatusMsg(err.error || "Failed to record sale.");
      }
    } catch { setStatus("error"); setStatusMsg("Network error."); }
    setLoading(false);
    setTimeout(() => setStatus("idle"), 5000);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this sale entry?")) return;
    setDeleting(id);
    await fetch("/api/sales", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadSales(filterMonth, filterYear);
    setDeleting(null);
  }

  function applyFilter() {
    loadSales(filterMonth, filterYear);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record and manage member sales entries</p>
      </div>

      {/* Entry Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800">New Sale Entry</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "success" && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />{statusMsg}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              <XCircle className="w-4 h-4 shrink-0" />{statusMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Select a member...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required
                placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Product batch #42"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>

            {/* Invoice upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Photo (optional)</label>
              {invoicePreview ? (
                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={invoicePreview} alt="Invoice preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={clearInvoice}
                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-gray-500 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center gap-2 w-fit px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-green-400 hover:text-green-600 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <ImagePlus className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Invoice"}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <Button type="submit" disabled={loading || uploading} className="bg-green-600 hover:bg-green-700 text-white">
              {loading ? "Saving..." : "Record Sale"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" /> Sales History
            </CardTitle>
            <div className="flex items-center gap-2">
              <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">All months</option>
                {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
              </select>
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <Button onClick={applyFilter} variant="outline" className="text-xs h-8 px-3">Filter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No sales recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sales.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.member.name}</p>
                    <p className="text-xs text-gray-500">
                      {s.member.memberId} · {months[s.month - 1]} {s.year}
                      {s.notes && ` · ${s.notes}`}
                    </p>
                    <p className="text-xs text-gray-400">by {s.enteredBy.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`text-xs hidden sm:inline-flex ${rankColors[s.member.rank] ?? "bg-gray-100 text-gray-700"}`}>
                      {s.member.rank.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm font-bold text-green-600">₹{s.amount.toLocaleString("en-IN")}</span>
                    {s.invoiceUrl && (
                      <a href={s.invoiceUrl} target="_blank" rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700" title="View Invoice">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
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
    </div>
  );
}
