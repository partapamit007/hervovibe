"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Pencil, Trash2, Package, Info } from "lucide-react";

interface Product {
  id: string;
  name: string;
  mrp: number;
  piDirect: number;
  piUpline: number;
  isActive: boolean;
}

const emptyForm = { name: "", mrp: "", piDirect: "", piUpline: "" };

function piLevels(upline: string): string {
  const base = parseFloat(upline);
  if (!base || base <= 0) return "";
  const levels = [];
  for (let i = 1; i <= 7; i++) {
    const val = base * Math.pow(0.5, i - 1);
    if (val < 0.01) break;
    levels.push(`L${i}=${val % 1 === 0 ? val : val.toFixed(2)}`);
  }
  return levels.join(" → ");
}

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
    setForm({ name: p.name, mrp: String(p.mrp), piDirect: String(p.piDirect), piUpline: String(p.piUpline) });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    const method = editId ? "PATCH" : "POST";
    const body = editId ? { id: editId, ...form } : form;
    const res = await fetch("/api/products", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setStatus("success");
      setStatusMsg(editId ? "Product updated." : "Product added.");
      setForm(emptyForm);
      setEditId(null);
      load();
    } else {
      const d = await res.json();
      setStatus("error");
      setStatusMsg(d.error || "Failed");
    }
    setLoading(false);
    setTimeout(() => setStatus("idle"), 4000);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"?`)) return;
    await fetch("/api/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const field = (key: keyof typeof emptyForm, label: string, placeholder: string, isNumber = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={isNumber ? "number" : "text"}
        min={isNumber ? "0" : undefined}
        step={isNumber ? "0.01" : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        required={key === "name" || key === "mrp"}
      />
    </div>
  );

  const preview = piLevels(form.piUpline);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Product Catalog</h1>
        <p className="text-gray-500 text-sm">Manage products and PI (Product Incentive) values</p>
      </div>

      {/* PI info banner */}
      <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-semibold mb-0.5">How PI (Product Incentive) works</p>
          <p className="text-blue-700 text-xs leading-relaxed">
            <strong>PI Direct</strong> — points the seller earns per unit sold (stays with the seller).<br />
            <strong>PI Upline L1</strong> — points the direct sponsor earns. Each level above gets half: L1 gets full, L2 gets 50%, L3 gets 25%, and so on up to 7 levels.<br />
            Monthly PI rate (₹/point) is set by the admin and converts points to payout.
          </p>
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
              {field("name", "Product Name *", "e.g. Herbal Capsules 60 pcs")}
              {field("mrp", "MRP (₹) *", "e.g. 599", true)}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">PI — Product Incentive (points per unit)</p>
              <div className="grid grid-cols-2 gap-3">
                {field("piDirect", "PI Direct — seller earns (pts)", "e.g. 5", true)}
                {field("piUpline", "PI Upline L1 — first sponsor (pts)", "e.g. 2", true)}
              </div>
              {preview && (
                <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-3 py-1.5 rounded-md">
                  Upline distribution: {preview}
                </p>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 italic">
                BI (Business Incentive) is decided manually by the admin — not set per product.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? "Saving..." : editId ? "Update Product" : "Add Product"}
              </Button>
              {editId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>Cancel</Button>
              )}
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
            <div className="divide-y divide-gray-100">
              {products.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      MRP: ₹{p.mrp.toLocaleString("en-IN")}
                      &nbsp;·&nbsp; PI Direct: {p.piDirect}pts
                      &nbsp;·&nbsp; PI Upline L1: {p.piUpline}pts
                      {p.piUpline > 0 && (
                        <span className="text-blue-500"> ({piLevels(String(p.piUpline))})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="text-gray-400 hover:text-red-500 transition-colors">
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
