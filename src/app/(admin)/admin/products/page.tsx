"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Pencil, Trash2, Package, Info } from "lucide-react";

interface Product {
  id: string;
  name: string;
  mrp: number;
  piRate: number;
  biRate: number;
  isActive: boolean;
}

const emptyForm = { name: "", mrp: "", piRate: "10", biRate: "1" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  }

  function startEdit(p: Product) {
    setEditId(p.id);
    setForm({ name: p.name, mrp: String(p.mrp), piRate: String(p.piRate ?? 10), biRate: String(p.biRate ?? 1) });
  }

  function cancelEdit() { setEditId(null); setForm(emptyForm); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setStatus("idle");
    const method = editId ? "PATCH" : "POST";
    const body = editId
      ? { id: editId, name: form.name, mrp: form.mrp, piRate: form.piRate, biRate: form.biRate }
      : { name: form.name, mrp: form.mrp, piRate: form.piRate, biRate: form.biRate };
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

  const mrpVal  = parseFloat(form.mrp)    || 0;
  const piVal   = parseFloat(form.piRate) || 0;
  const biVal   = parseFloat(form.biRate) || 0;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Product Catalog</h1>
        <p className="text-gray-500 text-sm">Set MRP, PI%, and BI% per product</p>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <div className="text-blue-800 text-xs leading-relaxed">
          <p className="font-semibold mb-1">How incentives work</p>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <p className="font-medium text-green-700">PI — Product Incentive (Monthly)</p>
              <p className="text-blue-700">PI% of MRP per sale. Seller keeps full amount. All upline members split equally. Paid every month.</p>
            </div>
            <div>
              <p className="font-medium text-purple-700">BI — Business Incentive (Admin-scheduled)</p>
              <p className="text-blue-700">BI% of MRP per sale. All upline members split equally (same rule as PI). Accumulated in member profile. Admin releases quarterly / half-yearly / yearly.</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base">{editId ? "Edit Product" : "Add New Product"}</CardTitle>
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
                <label className="block text-xs font-medium text-gray-600 mb-1">MRP (₹) *</label>
                <input type="number" min="0" step="0.01" required value={form.mrp}
                  onChange={e => setForm({ ...form, mrp: e.target.value })}
                  placeholder="e.g. 600"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1">PI % (Product Incentive — Monthly)</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.01" value={form.piRate}
                    onChange={e => setForm({ ...form, piRate: e.target.value })}
                    placeholder="10"
                    className="w-full px-2.5 py-1.5 pr-7 border border-green-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-gray-400">%</span>
                </div>
                {mrpVal > 0 && piVal > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    = ₹{(mrpVal * piVal / 100).toFixed(2)} per unit sold
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-purple-700 mb-1">BI % (Business Incentive — Admin-scheduled)</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.01" value={form.biRate}
                    onChange={e => setForm({ ...form, biRate: e.target.value })}
                    placeholder="1"
                    className="w-full px-2.5 py-1.5 pr-7 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-gray-400">%</span>
                </div>
                {mrpVal > 0 && biVal > 0 && (
                  <p className="text-xs text-purple-600 mt-1">
                    L1=₹{(mrpVal * biVal / 100).toFixed(2)} · L2=₹{(mrpVal * biVal / 200).toFixed(2)} · L3=₹{(mrpVal * biVal / 400).toFixed(2)} · ...
                  </p>
                )}
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
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-green-600" />
            Active Products ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No products yet. Add one above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium pr-4">Product</th>
                    <th className="text-right pb-2 font-medium px-3">MRP</th>
                    <th className="text-right pb-2 font-medium px-3 text-green-700">PI %</th>
                    <th className="text-right pb-2 font-medium px-3 text-green-700">PI / unit</th>
                    <th className="text-right pb-2 font-medium px-3 text-purple-700">BI %</th>
                    <th className="text-right pb-2 font-medium px-3 text-purple-700">BI / unit</th>
                    <th className="pb-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((p) => {
                    const piRate = p.piRate ?? 10;
                    const biRate = p.biRate ?? 1;
                    const piAmt  = p.mrp * piRate / 100;
                    const biAmt  = p.mrp * biRate / 100;
                    return (
                      <tr key={p.id}>
                        <td className="py-3 pr-4 font-semibold text-gray-800">{p.name}</td>
                        <td className="py-3 px-3 text-right text-gray-700">₹{p.mrp.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-3 text-right text-green-700 font-medium">{piRate}%</td>
                        <td className="py-3 px-3 text-right text-green-600">₹{piAmt.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right text-purple-700 font-medium">{biRate}%</td>
                        <td className="py-3 px-3 text-right text-purple-600">₹{biAmt.toFixed(2)}</td>
                        <td className="py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-blue-600">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id, p.name)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
    </div>
  );
}
