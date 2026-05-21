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
    sponsorId: "", managedBy: "",
    joiningDate: today,
  });
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/members?all=1").then(r => r.json()).then(data => setSponsors(Array.isArray(data) ? data : []));
    fetch("/api/team-members").then(r => r.json()).then(data => setTeamMembers(Array.isArray(data) ? data : []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/admin/members");
    } else {
      const d = await res.json();
      setError(d.error || "Failed to add member");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add New Member</h1>
        <p className="text-gray-500 text-sm">Default login password: <span className="font-mono bg-gray-100 px-1 rounded">Member@123</span></p>
      </div>

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        ⚠️ Minimum monthly sale of <strong>₹1,800</strong> is mandatory to maintain active membership.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                required type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="rajesh@example.com"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Started *</label>
              <input
                required type="date"
                value={form.joiningDate}
                onChange={e => setForm({ ...form, joiningDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">First month sales of ₹1,800 must be recorded from this date</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor (Upline)</label>
              <select
                value={form.sponsorId}
                onChange={e => setForm({ ...form, sponsorId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">— No sponsor —</option>
                {sponsors.map((s: any) => {
                  const filled = s._count?.downline || 0;
                  const label = filled >= 5 ? `✓ ${filled} members` : `${filled}/5 min`;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.memberId}) — {label}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-400 mt-1">Minimum 5 direct members required for rank qualification</p>
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
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? "Adding..." : "Add Member"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
