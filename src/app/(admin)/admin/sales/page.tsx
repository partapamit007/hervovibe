"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle, XCircle, Trash2, ExternalLink, ImagePlus, X, Plus, Minus, Printer } from "lucide-react";

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
interface Product { id: string; name: string; mrp: number; piDirect: number; piUpline: number; }
interface SaleItem { productId: string; quantity: number; }
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
  const [products, setProducts] = useState<Product[]>([]);
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
  const [memberSearch, setMemberSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [notes, setNotes] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [invoicePreview, setInvoicePreview] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);

  const autoAmount = items.reduce((sum, item) => {
    const p = products.find((p) => p.id === item.productId);
    return sum + (p ? p.mrp * item.quantity : 0);
  }, 0);

  useEffect(() => {
    fetch("/api/members?all=1").then((r) => r.json()).then((d) => setMembers(Array.isArray(d) ? d : []));
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(Array.isArray(d) ? d : []));
    loadSales();
  }, []);

  function addItem() {
    if (products.length === 0) return;
    setItems([...items, { productId: products[0].id, quantity: 1 }]);
  }

  function updateItem(index: number, field: keyof SaleItem, value: string) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: field === "quantity" ? Math.max(1, parseInt(value) || 1) : value };
    setItems(updated);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

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
      const finalAmount = items.length > 0 ? autoAmount : parseFloat(amount);
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, amount: items.length > 0 ? 0 : amount, month, year, invoiceUrl, notes, items }),
      });
      if (res.ok) {
        const member = members.find((m) => m.id === memberId);
        setStatus("success");
        setStatusMsg(`Sale of ₹${finalAmount.toLocaleString("en-IN")} recorded for ${member?.name ?? "member"}.`);
        setMemberId(""); setAmount(""); setNotes(""); setItems([]);
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

  function printInvoice(s: Sale) {
    const invoiceNo = `HV-${s.id.slice(-6).toUpperCase()}`;
    const printDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
    const saleMonth = months[s.month - 1];
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Invoice ${invoiceNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #16a34a; padding-bottom: 16px; margin-bottom: 24px; }
  .brand h1 { font-size: 22px; font-weight: 800; color: #16a34a; }
  .brand p { font-size: 11px; color: #555; margin-top: 2px; }
  .inv-meta { text-align: right; }
  .inv-meta h2 { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  .inv-meta p { font-size: 11px; color: #666; margin-top: 3px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .info-row { display: flex; gap: 6px; margin-bottom: 4px; }
  .info-label { font-size: 11px; color: #666; min-width: 90px; }
  .info-value { font-size: 12px; font-weight: 600; color: #1a1a1a; }
  .amount-box { background: #f0fdf4; border: 1.5px solid #16a34a; border-radius: 8px; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; margin: 24px 0; }
  .amount-label { font-size: 13px; color: #166534; font-weight: 600; }
  .amount-value { font-size: 24px; font-weight: 800; color: #15803d; }
  .footer { border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 10px; color: #9ca3af; }
  .badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; margin-left: 6px; }
  @media print { body { padding: 20px; } }
</style></head><body>
<div class="header">
  <div class="brand">
    <h1>Bengal Herbovibe</h1>
    <p>A Herbal Div. of Vibdrugs · herbovibe.in</p>
  </div>
  <div class="inv-meta">
    <h2>SALE RECEIPT</h2>
    <p>${invoiceNo}</p>
    <p>Printed: ${printDate}</p>
  </div>
</div>
<div class="info-grid section">
  <div>
    <div class="section-title">Member Details</div>
    <div class="info-row"><span class="info-label">Name</span><span class="info-value">${s.member.name}</span></div>
    <div class="info-row"><span class="info-label">Member ID</span><span class="info-value">${s.member.memberId} <span class="badge">${s.member.rank.replace(/_/g, " ")}</span></span></div>
  </div>
  <div>
    <div class="section-title">Sale Period</div>
    <div class="info-row"><span class="info-label">Month</span><span class="info-value">${saleMonth} ${s.year}</span></div>
    <div class="info-row"><span class="info-label">Recorded by</span><span class="info-value">${s.enteredBy.name}</span></div>
    ${s.notes ? `<div class="info-row"><span class="info-label">Notes</span><span class="info-value">${s.notes}</span></div>` : ""}
  </div>
</div>
<div class="amount-box">
  <span class="amount-label">Total Sale Amount</span>
  <span class="amount-value">₹${s.amount.toLocaleString("en-IN")}</span>
</div>
<div class="footer">
  <p>Bengal Herbovibe — A Herbal Div. of Vibdrugs · Panchkula, Tricity Chandigarh</p>
  <p>This is a computer-generated document.</p>
</div>
</body></html>`;
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
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
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by ID or name..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-t-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border-b-0"
              />
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required size={5}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-b-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Select a member...</option>
                {members
                  .filter((m) => {
                    const q = memberSearch.toLowerCase();
                    return !q || m.memberId?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q);
                  })
                  .map((m) => <option key={m.id} value={m.id}>[{m.memberId}] — {m.name}</option>)}
              </select>
            </div>
            {/* Product Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Products (optional)</label>
                {products.length > 0 ? (
                  <button type="button" onClick={addItem}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium">
                    <Plus className="w-3.5 h-3.5" /> Add Product
                  </button>
                ) : (
                  <a href="/admin/products" className="text-xs text-blue-500 hover:underline">
                    Add products to catalog first →
                  </a>
                )}
              </div>
              {items.length > 0 && (
                <div className="space-y-2 mb-2">
                  {items.map((item, i) => {
                    const p = products.find((p) => p.id === item.productId);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(i, "productId", e.target.value)}
                          className="flex-1 px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} — ₹{p.mrp}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => updateItem(i, "quantity", String(item.quantity - 1))}
                            className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button type="button" onClick={() => updateItem(i, "quantity", String(item.quantity + 1))}
                            className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 w-16 text-right">
                          ₹{((p?.mrp ?? 0) * item.quantity).toLocaleString("en-IN")}
                        </span>
                        <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <div className="text-right text-sm font-semibold text-green-700 pr-12">
                    Total: ₹{autoAmount.toLocaleString("en-IN")}
                  </div>
                </div>
              )}
            </div>

            {/* Manual amount — only shown if no products selected */}
            {items.length === 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required
                placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            )}
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
                    <button onClick={() => printInvoice(s)} title="Print Invoice"
                      className="text-gray-400 hover:text-green-600 transition-colors">
                      <Printer className="w-4 h-4" />
                    </button>
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
