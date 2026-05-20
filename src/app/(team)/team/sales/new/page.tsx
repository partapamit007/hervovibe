"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, PlusCircle, ImagePlus, X } from "lucide-react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface Member { id: string; name: string; memberId: string | null; }

export default function AddSalePage() {
  const now = new Date();
  const fileRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [notes, setNotes] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState("");
  const [invoicePreview, setInvoicePreview] = useState("");

  useEffect(() => {
    fetch("/api/team/members").then((r) => r.json()).then((d) => setMembers(Array.isArray(d) ? d : []));
  }, []);

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
        setStatusMsg("Invoice upload failed.");
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
        setStatusMsg(`Sale of ₹${parseInt(amount).toLocaleString("en-IN")} recorded for ${member?.name ?? "member"} — ${months[parseInt(month) - 1]} ${year}.`);
        setMemberId(""); setAmount(""); setNotes("");
        clearInvoice();
      } else {
        const err = await res.json();
        setStatus("error");
        setStatusMsg(err.error || "Failed to record sale.");
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Member</label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a member...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} {m.memberId ? `(${m.memberId})` : ""}</option>
                ))}
              </select>
              {members.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No members assigned to you yet</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₹)</label>
              <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} required
                placeholder="e.g. 5000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional info"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
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
            <Button type="submit" disabled={loading || uploading || members.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? "Saving..." : "Record Sale"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
