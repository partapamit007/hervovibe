"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Pencil, Trash2, Package, Info, AlertTriangle, Plus, Minus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  mrp: number;
  piRate: number;
  piUpline: number;
  biRate: number;
  biUpline: number;
  stock: number;
  lowStockAlert: number;
  isActive: boolean;
}

const emptyForm = { name: "", mrp: "", piRate: "0", piUpline: "0", biRate: "0", biUpline: "0", stock: "0", lowStockAlert: "10" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [stockAdjustId, setStockAdjustId] = useState<string | null>(null);
  const [stockAdjustVal, setStockAdjustVal] = useState("");
  const [stockSaving, setStockSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  }

  function startEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name, mrp: String(p.mrp),
      piRate: String(p.piRate ?? 10), piUpline: String(p.piUpline ?? 5),
      biRate: String(p.biRate ?? 1), biUpline: String(p.biUpline ?? 0.5),
      stock: String(p.stock ?? 0), lowStockAlert: String(p.lowStockAlert ?? 10),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() { setEditId(null); setForm(emptyForm); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setStatus("idle");
    const method = editId ? "PATCH" : "POST";
    const body = editId
      ? { id: editId, name: form.name, mrp: form.mrp, piRate: form.piRate, piUpline: form.piUpline, biRate: form.biRate, biUpline: form.biUpline, stock: form.stock, lowStockAlert: form.lowStockAlert }
      : { name: form.name, mrp: form.mrp, piRate: form.piRate, piUpline: form.piUpline, biRate: form.biRate, biUpline: form.biUpline, stock: form.stock, lowStockAlert: form.lowStockAlert };
    const res = await fetch("/api/products", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) {
      setStatus("success"); setStatusMsg(editId ? "Product updated." : "Product added.");
      setForm(emptyForm); setEditId(null); load();
    } else {
      const d = await res.json(); setStatus("error"); setStatusMsg(d.error || "Failed");
    }
    setLoading(false);
    setTimeout(() => setStatus("idle"), 4000);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"?`)) return;
    await fetch("/api/products", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    load();
  }

  async function handleStockAdjust(id: string, delta: number) {
    setStockSaving(true);
    await fetch("/api/products", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stockAdjust: delta }),
    });
    setStockAdjustId(null); setStockAdjustVal("");
    setStockSaving(false);
    load();
  }

  async function handleManualStock(id: string) {
    const val = parseInt(stockAdjustVal);
    if (isNaN(val)) return;
    setStockSaving(true);
    await fetch("/api/products", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock: val }),
    });
    setStockAdjustId(null); setStockAdjustVal("");
    setStockSaving(false);
    load();
  }

  const piVal       = parseFloat(form.piRate)   || 0;
  const piUplineVal = parseFloat(form.piUpline) || 0;
  const biVal       = parseFloat(form.biRate)   || 0;
  const biUplineVal = parseFloat(form.biUpline) || 0;

  const outOfStock     = products.filter(p => p.stock <= 0);
  const lowStock       = products.filter(p => p.stock > 0 && p.stock <= p.lowStockAlert);
  const filteredProducts = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : products;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Product Catalog</h1>
        <p className="text-gray-500 text-sm">Manage products, incentive rates, and stock levels</p>
      </div>

      {/* Stock alerts */}
      {(outOfStock.length > 0 || lowStock.length > 0) && (
        <div className="space-y-2 mb-6">
          {outOfStock.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>{p.name}</strong> is out of stock</span>
            </div>
          ))}
          {lowStock.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span><strong>{p.name}</strong> — only {p.stock} units left (alert threshold: {p.lowStockAlert})</span>
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <div className="text-blue-800 text-xs leading-relaxed">
          <p className="font-semibold mb-1">How incentives work — Fixed ₹/unit amounts</p>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <p className="font-medium text-green-700">PI — Product Incentive (Monthly)</p>
              <p className="text-blue-700"><strong>PI Seller</strong>: fixed ₹ the seller earns per unit. <strong>PI Upline</strong>: L1 upline gets this full amount per unit; L2 gets 50%, L3 gets 25%, and so on (halving). Paid monthly.</p>
            </div>
            <div>
              <p className="font-medium text-purple-700">BI — Business Incentive (Admin-scheduled)</p>
              <p className="text-blue-700"><strong>BI Seller</strong>: fixed ₹ the seller earns per unit. <strong>BI Upline</strong>: same halving rule — L1 gets full amount, L2 gets 50%, L3 gets 25%… Released by admin.</p>
            </div>
          </div>
        </div>
      </div>

      <Card className={`mb-8 ${editId ? "ring-2 ring-blue-400" : ""}`}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {editId ? <><Pencil className="w-4 h-4 text-blue-500" /> Editing Product</> : "Add New Product"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "success" && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2 mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />{statusMsg}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">
              <XCircle className="w-4 h-4 shrink-0" />{statusMsg}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Herbal Capsules 60 pcs"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sale Price (₹) *</label>
                <input type="number" min="0" step="0.01" required value={form.mrp}
                  onChange={e => setForm({ ...form, mrp: e.target.value })}
                  placeholder="e.g. 600"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Initial Stock (units)</label>
                <input type="number" min="0" value={form.stock}
                  onChange={e => setForm({ ...form, stock: e.target.value })}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Low Stock Alert (units)</label>
                <input type="number" min="0" value={form.lowStockAlert}
                  onChange={e => setForm({ ...form, lowStockAlert: e.target.value })}
                  placeholder="10"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-600">Incentive Rates (₹ per unit — fixed amount, no %)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-green-700 mb-1">PI Seller (₹/unit)</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.01" value={form.piRate}
                      onChange={e => setForm({ ...form, piRate: e.target.value })} placeholder="0.00"
                      className="w-full px-2.5 py-1.5 pr-7 border border-green-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-gray-400">₹</span>
                  </div>
                  {piVal > 0 && <p className="text-xs text-green-600 mt-1">Seller earns ₹{piVal.toFixed(2)} per unit sold</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-700 mb-1">PI Upline (₹/unit)</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.01" value={form.piUpline}
                      onChange={e => setForm({ ...form, piUpline: e.target.value })} placeholder="0.00"
                      className="w-full px-2.5 py-1.5 pr-7 border border-green-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-gray-400">₹</span>
                  </div>
                  {piUplineVal > 0 && (
                    <p className="text-xs text-gray-400 mt-1">L1: ₹{piUplineVal.toFixed(2)} · L2: ₹{(piUplineVal * 0.5).toFixed(2)} · L3: ₹{(piUplineVal * 0.25).toFixed(2)}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">BI Seller (₹/unit)</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.01" value={form.biRate}
                      onChange={e => setForm({ ...form, biRate: e.target.value })} placeholder="0.00"
                      className="w-full px-2.5 py-1.5 pr-7 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-gray-400">₹</span>
                  </div>
                  {biVal > 0 && <p className="text-xs text-purple-600 mt-1">Seller earns ₹{biVal.toFixed(2)} per unit sold</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-purple-700 mb-1">BI Upline (₹/unit)</label>
                  <div className="relative">
                    <input type="number" min="0" step="0.01" value={form.biUpline}
                      onChange={e => setForm({ ...form, biUpline: e.target.value })} placeholder="0.00"
                      className="w-full px-2.5 py-1.5 pr-7 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-gray-400">₹</span>
                  </div>
                  {biUplineVal > 0 && (
                    <p className="text-xs text-gray-400 mt-1">L1: ₹{biUplineVal.toFixed(2)} · L2: ₹{(biUplineVal * 0.5).toFixed(2)} · L3: ₹{(biUplineVal * 0.25).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? "Saving..." : editId ? "Update Product" : "Add Product"}
              </Button>
              {editId && <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-green-600" />
              Active Products ({products.length}{search.trim() && filteredProducts.length !== products.length ? ` · ${filteredProducts.length} shown` : ""})
            </CardTitle>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-56"
            />
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No products yet. Add one above.</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No products match &quot;{search}&quot;</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredProducts.map((p) => {
                const stockStatus = p.stock <= 0 ? "out" : p.stock <= p.lowStockAlert ? "low" : "ok";
                return (
                  <div key={p.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800 text-sm">{p.name}</p>
                          <span className="text-xs text-gray-500">₹{p.mrp.toLocaleString("en-IN")}</span>
                          {stockStatus === "out" && (
                            <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Out of Stock</span>
                          )}
                          {stockStatus === "low" && (
                            <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Low Stock</span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="text-green-700">PI seller ₹{p.piRate}/unit · upline L1 ₹{p.piUpline}/unit</span>
                          <span className="text-purple-700">BI seller ₹{p.biRate}/unit · upline L1 ₹{p.biUpline}/unit</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-bold ${stockStatus === "out" ? "text-red-600" : stockStatus === "low" ? "text-amber-600" : "text-gray-800"}`}>
                            {p.stock} units
                          </p>
                          <p className="text-xs text-gray-400">stock</p>
                        </div>
                        <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-blue-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stock adjustment inline */}
                    {stockAdjustId === p.id ? (
                      <div className="flex items-center gap-2 mt-3 bg-gray-50 rounded-lg p-2">
                        <button onClick={() => handleStockAdjust(p.id, -1)} disabled={stockSaving} className="w-7 h-7 flex items-center justify-center rounded bg-red-100 text-red-600 hover:bg-red-200">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input type="number" value={stockAdjustVal} onChange={e => setStockAdjustVal(e.target.value)}
                          placeholder="Set exact stock"
                          className="flex-1 px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                        />
                        <button onClick={() => handleStockAdjust(p.id, 1)} disabled={stockSaving} className="w-7 h-7 flex items-center justify-center rounded bg-green-100 text-green-600 hover:bg-green-200">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <Button size="sm" onClick={() => handleManualStock(p.id)} disabled={stockSaving || !stockAdjustVal} className="bg-green-600 hover:bg-green-700 text-xs h-7">Set</Button>
                        <button onClick={() => { setStockAdjustId(null); setStockAdjustVal(""); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => { setStockAdjustId(p.id); setStockAdjustVal(String(p.stock)); }}
                        className="mt-1.5 text-xs text-blue-500 hover:text-blue-700">
                        Adjust stock
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
