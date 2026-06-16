"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, PlusCircle, ImagePlus, X, Plus, Minus } from "lucide-react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface Member  { id: string; name: string; memberId: string | null; }
interface Product { id: string; name: string; mrp: number; }
interface SaleItem { productId: string; quantity: number; }

export default function AddSalePage() {
  const now = new Date();
  const fileRef = useRef<HTMLInputElement>(null);
  const [members,  setMembers]  = useState<Member[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status,    setStatus]    = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const [memberId,      setMemberId]      = useState("");
  const [memberSearch,  setMemberSearch]  = useState("");
  const [month,         setMonth]         = useState(String(now.getMonth() + 1));
  const [year,          setYear]          = useState(String(now.getFullYear()));
  const [notes,         setNotes]         = useState("");
  const [invoiceUrl,    setInvoiceUrl]    = useState("");
  const [invoicePreview,setInvoicePreview]= useState("");
  const [items,         setItems]         = useState<SaleItem[]>([]);
  const [manualAmount,  setManualAmount]  = useState("");

  const autoAmount = items.reduce((sum, item) => {
    const p = products.find((p) => p.id === item.productId);
    return sum + (p ? p.mrp * item.quantity : 0);
  }, 0);

  useEffect(() => {
    fetch("/api/team/members").then((r) => r.json()).then((d) => setMembers(Array.isArray(d) ? d : []));
    fetch("/api/products").then((r) => r.json()).then((d) => setProducts(Array.isArray(d) ? d : []));
  }, []);

  function addItem() {
    if (products.length === 0) return;
    setItems([...items, { productId: products[0].id, quantity: 1 }]);
  }

  function updateItem(i: number, field: keyof SaleItem, value: string) {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: field === "quantity" ? Math.max(1, parseInt(value) || 1) : value };
    setItems(updated);
  }

  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }

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
        setStatus("error"); setStatusMsg("Invoice upload failed.");
        setTimeout(() => setStatus("idle"), 5000);
      }
    } catch { /* ignore */ }
    setUploading(false);
  }

  function clearInvoice() {
    setInvoiceUrl(""); setInvoicePreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const finalAmount = items.length > 0 ? autoAmount : parseFloat(manualAmount || "0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!finalAmount) { setStatus("error"); setStatusMsg("Add products or enter an amount."); setTimeout(() => setStatus("idle"), 4000); return; }
    setLoading(true); setStatus("idle");
    try {
      const body: Record<string, any> = { memberId, month, year, invoiceUrl, notes };
      if (items.length > 0) body.items = items;
      else body.amount = manualAmount;

      const res = await fetch("/api/sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const member = members.find((m) => m.id === memberId);
        setStatus("success");
        setStatusMsg(`₹${finalAmount.toLocaleString("en-IN")} recorded for ${member?.name ?? "member"} — ${months[parseInt(month) - 1]} ${year}.`);
        setMemberId(""); setNotes(""); setItems([]); setManualAmount(""); clearInvoice();
      } else {
        const err = await res.json();
        setStatus("error"); setStatusMsg(err.error || "Failed to record sale.");
      }
    } catch { setStatus("error"); setStatusMsg("Network error."); }
    setLoading(false);
    setTimeout(() => setStatus("idle"), 6000);
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Sale</h1>
        <p className="text-sm text-gray-500 mt-0.5">Record a sale for one of your assigned members</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-600" /> New Sale Entry
          </CardTitle>
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
            {/* Member */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search by ID or name..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-t-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-b-0"
              />
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required size={5}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-b-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a member...</option>
                {members
                  .filter((m) => {
                    const q = memberSearch.toLowerCase();
                    return !q || m.memberId?.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q);
                  })
                  .map((m) => (
                    <option key={m.id} value={m.id}>[{m.memberId || "—"}] — {m.name}</option>
                  ))}
              </select>
              {members.length === 0 && <p className="text-xs text-gray-400 mt-1">No members assigned to you yet</p>}
            </div>

            {/* Products */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Products</label>
                {products.length > 0 && (
                  <button type="button" onClick={addItem}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                    <Plus className="w-3 h-3" /> Add Product
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-gray-400 mb-1">
                  {products.length === 0 ? "No products in catalog" : "Add products to auto-calculate amount"}
                </p>
              ) : (
                <div className="space-y-2 mb-2">
                  {items.map((item, i) => {
                    const p = products.find((p) => p.id === item.productId);
                    return (
                      <div key={i} className="flex gap-2 items-center p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                        <select value={item.productId} onChange={(e) => updateItem(i, "productId", e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} — ₹{p.mrp.toLocaleString("en-IN")}</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => updateItem(i, "quantity", String(item.quantity - 1))}
                            className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <button type="button" onClick={() => updateItem(i, "quantity", String(item.quantity + 1))}
                            className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100">
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
                  <div className="flex justify-between text-sm font-semibold text-gray-700 px-1">
                    <span>Total</span>
                    <span className="text-green-700">₹{autoAmount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}

              {/* Manual amount fallback when no products selected */}
              {items.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
                  <input type="number" min="1" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>

            {/* Month / Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
                <select value={month} onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional info"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Invoice */}
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
                <label className={`flex items-center gap-2 w-fit px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <ImagePlus className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Invoice"}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <Button type="submit" disabled={loading || uploading || !memberId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? "Saving..." : `Record Sale${finalAmount > 0 ? ` — ₹${finalAmount.toLocaleString("en-IN")}` : ""}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
