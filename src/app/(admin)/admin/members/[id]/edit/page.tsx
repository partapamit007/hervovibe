"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ranks    = ["DISTRIBUTOR","BRONZE","SILVER","GOLDEN","DIAMOND","SUPER_DIAMOND","PLATINUM","CENTENNIAL"];
const statuses = ["ACTIVE","INACTIVE","CANCELLED"];

type Tab = "basic" | "kyc" | "bank";

export default function EditMemberPage() {
  const { id } = useParams();
  const router  = useRouter();
  const [tab, setTab]       = useState<Tab>("basic");
  const [form, setForm]     = useState<any>(null);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorSearch, setSponsorSearch] = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${id}`).then(r => r.json()),
      fetch("/api/members?all=1").then(r => r.json()),
    ]).then(([member, allMembers]) => {
      setForm({
        memberId:      member.memberId     || "",
        name:          member.name         || "",
        email:         member.email        || "",
        phone:         member.phone        || "",
        rank:          member.rank         || "DISTRIBUTOR",
        status:        member.status       || "ACTIVE",
        sponsorId:     member.sponsorId    || "",
        panNumber:     member.panNumber    || "",
        aadhaarNumber: member.aadhaarNumber || "",
        address:       member.address      || "",
        bankAccount:   member.bankAccount  || "",
        ifscCode:      member.ifscCode     || "",
        upiId:         member.upiId        || "",
        bankName:      member.bankName     || "",
      });
      setSponsors(Array.isArray(allMembers) ? allMembers.filter((m: any) => m.id !== id) : []);
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else { setError("Failed to save changes."); }
    setSaving(false);
  }

  const input = (field: string, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[field]}
        onChange={e => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>
  );

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <h1 className="text-2xl font-bold text-gray-800">Edit Member</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {(["basic","kyc","bank"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "basic" ? "Basic Info" : t === "kyc" ? "KYC / Identity" : "Bank Details"}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800">
            {tab === "basic" ? "Basic Information" : tab === "kyc" ? "KYC & Identity Documents" : "Bank / Payout Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "basic" && (
              <>
                {input("memberId", "Member ID", "text")}
                {input("name",  "Full Name")}
                {input("email", "Email", "email")}
                {input("phone", "Phone")}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rank</label>
                  <select value={form.rank} onChange={e => setForm({ ...form, rank: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {ranks.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor (Upline)</label>
                  <input
                    type="text"
                    value={sponsorSearch}
                    onChange={e => setSponsorSearch(e.target.value)}
                    placeholder="Search by ID or name..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-t-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border-b-0"
                  />
                  <select value={form.sponsorId} onChange={e => setForm({ ...form, sponsorId: e.target.value })}
                    size={5}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-b-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">— No sponsor —</option>
                    {sponsors
                      .filter((s: any) => {
                        const q = sponsorSearch.toLowerCase();
                        return !q || s.memberId?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q);
                      })
                      .map((s: any) => (
                        <option key={s.id} value={s.id}>[{s.memberId}] — {s.name}</option>
                      ))}
                  </select>
                </div>
              </>
            )}

            {tab === "kyc" && (
              <>
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  KYC documents are sensitive. Ensure data is verified before saving.
                </p>
                {input("panNumber",     "PAN Number",     "text", "e.g. ABCDE1234F")}
                {input("aadhaarNumber", "Aadhaar Number", "text", "12-digit Aadhaar")}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    rows={3}
                    placeholder="Full address with PIN code"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>
              </>
            )}

            {tab === "bank" && (
              <>
                <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Bank details are used for salary and incentive payouts.
                </p>
                {input("bankName",    "Bank Name",           "text", "e.g. State Bank of India")}
                {input("bankAccount", "Account Number",      "text", "e.g. 1234567890")}
                {input("ifscCode",    "IFSC Code",           "text", "e.g. SBIN0001234")}
                {input("upiId",       "UPI ID (optional)",   "text", "e.g. name@upi")}
              </>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {saved && <p className="text-green-600 text-sm">✓ Saved successfully</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
