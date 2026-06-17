"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AddMemberPage() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    memberId: "",
    sponsorId: "", managedBy: "",
    joiningDate: today,
    panNumber: "", aadhaarNumber: "", address: "",
    bankName: "", bankAccount: "", ifscCode: "", upiId: "",
  });
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [sponsorSearch, setSponsorSearch] = useState("");
  const [noSponsor, setNoSponsor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    fetch("/api/members?all=1").then(r => r.json()).then(data => setSponsors(Array.isArray(data) ? data : []));
    fetch("/api/team-members").then(r => r.json()).then(data => setTeamMembers(Array.isArray(data) ? data : []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (res.ok) {
        setTempPassword(d.tempPassword ?? "");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(d.error || "Failed to add member");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add New Member</h1>
        <p className="text-gray-500 text-sm">A secure temporary password is generated automatically.</p>
      </div>

      {false && (
        <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-lg">
          <p className="text-sm font-semibold text-green-800 mb-1">Member created successfully!</p>
          <p className="text-sm text-green-700">
            Share this temporary password with the member:{" "}
            <span className="font-mono font-bold bg-white border border-green-300 px-2 py-0.5 rounded text-green-900">
              {tempPassword}
            </span>
          </p>
          <p className="text-xs text-green-600 mt-1">They should change it after first login.</p>
          <button onClick={() => router.push("/admin/members")}
            className="mt-2 text-sm text-green-700 underline hover:no-underline">
            Go to members list →
          </button>
        </div>
      )}

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        ⚠️ Minimum monthly sale of <strong>₹1,260</strong> is mandatory to maintain active membership.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member ID</label>
              <input
                value={form.memberId}
                onChange={e => setForm({ ...form, memberId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="HV-0100 (auto-generated if empty)"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to auto-generate</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Rajesh Kumar"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="rajesh@example.com (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Started</label>
              <input
                type="date"
                value={form.joiningDate}
                onChange={e => setForm({ ...form, joiningDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">First month sales of ₹1,260 must be recorded from this date</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sponsor (Upline)</label>
              <div className="flex gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => { setNoSponsor(false); }}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all ${!noSponsor ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}
                >
                  Has a Sponsor
                </button>
                <button
                  type="button"
                  onClick={() => { setNoSponsor(true); setForm({ ...form, sponsorId: "" }); setSponsorSearch(""); }}
                  className={`flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-all ${noSponsor ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}
                >
                  Direct / No Sponsor
                </button>
              </div>
              {noSponsor ? (
                <div className="bg-orange-50 border border-orange-200 rounded-md px-4 py-3 text-sm text-orange-800">
                  This member joined directly under the company — no upline sponsor.
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={sponsorSearch}
                    onChange={e => setSponsorSearch(e.target.value)}
                    placeholder="Search by ID or name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-t-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 border-b-0"
                  />
                  <select
                    value={form.sponsorId}
                    onChange={e => setForm({ ...form, sponsorId: e.target.value })}
                    size={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-b-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">— Select a sponsor —</option>
                    {sponsors
                      .filter((s: any) => {
                        const q = sponsorSearch.toLowerCase();
                        return !q || s.memberId?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q);
                      })
                      .map((s: any) => {
                        const filled = s._count?.downline || 0;
                        const label = filled >= 6 ? `✓ ${filled} members` : `${filled}/6 min`;
                        return (
                          <option key={s.id} value={s.id}>
                            [{s.memberId}] — {s.name} ({label})
                          </option>
                        );
                      })}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Minimum 6 direct members required for rank qualification</p>
                </>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Team Member</label>
              <select
                value={form.managedBy}
                onChange={e => setForm({ ...form, managedBy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— None —</option>
                {teamMembers.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">KYC / Identity</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                    <input
                      value={form.panNumber}
                      onChange={e => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
                    <input
                      value={form.aadhaarNumber}
                      onChange={e => setForm({ ...form, aadhaarNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Full address"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">Bank / Payout Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    value={form.bankName}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="SBI"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    value={form.bankAccount}
                    onChange={e => setForm({ ...form, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="123456789012"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    value={form.ifscCode}
                    onChange={e => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="SBIN0001234"
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                  <input
                    value={form.upiId}
                    onChange={e => setForm({ ...form, upiId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="name@upi"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {tempPassword && (
              <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                <p className="text-sm font-semibold text-green-800 mb-1">✅ Member created successfully!</p>
                <p className="text-sm text-green-700 mb-2">Temporary password:&nbsp;
                  <span className="font-mono font-bold bg-white border border-green-300 px-2 py-0.5 rounded text-green-900">{tempPassword}</span>
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => router.push("/admin/members")}
                    className="text-sm text-white bg-green-600 px-3 py-1.5 rounded hover:bg-green-700">
                    Go to Members List
                  </button>
                  <button type="button" onClick={() => { setTempPassword(""); setForm({ name: "", email: "", phone: "", memberId: "", sponsorId: "", managedBy: "", joiningDate: today, panNumber: "", aadhaarNumber: "", address: "", bankName: "", bankAccount: "", ifscCode: "", upiId: "" }); }}
                    className="text-sm text-green-700 underline">
                    Add Another Member
                  </button>
                </div>
              </div>
            )}
            {!tempPassword && (
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                  {loading ? "Adding..." : "Add Member"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
