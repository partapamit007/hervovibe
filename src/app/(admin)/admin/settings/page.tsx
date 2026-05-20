"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, CheckCircle, Loader } from "lucide-react";

export default function SettingsPage() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setSuccess(true);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setError(data.error || "Failed to change password");
    }
    setLoading(false);
  }

  const [seeding, setSeeding]   = useState(false);
  const [seedDone, setSeedDone] = useState<any>(null);

  async function runSeed() {
    if (!confirm("This will add 165 demo members to the database. Continue?")) return;
    setSeeding(true);
    setSeedDone(null);
    const res = await fetch("/api/admin/seed", { method: "POST" });
    const data = await res.json();
    setSeedDone(data);
    setSeeding(false);
  }

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your admin account</p>
      </div>

      {/* Demo Data */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" /> Demo Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Load realistic test members — 1 Golden tree (156 members, each buying ₹1,800),
            1 Bronze with rank mismatch, and 5 standalone distributors.
          </p>
          {seedDone?.success && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Done! {seedDone.totals?.members} members, {seedDone.totals?.sales} sales added.</p>
                <p className="text-xs mt-0.5">Refresh the Members page to see them.</p>
              </div>
            </div>
          )}
          {seedDone?.error && (
            <p className="text-sm text-red-600">{seedDone.error}</p>
          )}
          <Button onClick={runSeed} disabled={seeding} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
            {seeding ? <><Loader className="w-4 h-4 animate-spin" /> Loading data... (30–60 sec)</> : "Load Demo Data"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                required
                type="password"
                value={form.currentPassword}
                onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                required
                type="password"
                value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                required
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Repeat new password"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm font-medium">Password changed successfully!</p>}

            <Button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
