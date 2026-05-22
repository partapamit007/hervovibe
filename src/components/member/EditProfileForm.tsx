"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Pencil, X } from "lucide-react";

interface Props {
  initial: {
    phone: string; address: string;
    bankName: string; bankAccount: string; ifscCode: string; upiId: string;
  };
}

export default function EditProfileForm({ initial }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function field(name: keyof typeof form, label: string, placeholder?: string) {
    return (
      <div key={name}>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        {editing ? (
          <input
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
            placeholder={placeholder ?? label}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        ) : (
          <p className="text-sm text-gray-800 py-1.5">{form[name] || <span className="text-gray-400">Not provided</span>}</p>
        )}
      </div>
    );
  }

  async function save() {
    setSaving(true); setMsg(""); setError("");
    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg("Saved successfully");
      setEditing(false);
      setTimeout(() => setMsg(""), 3000);
    } else {
      const d = await res.json();
      setError(d.error || "Failed to save");
    }
    setSaving(false);
  }

  return (
    <Card className="mb-5">
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-800">Contact & Bank Details</CardTitle>
          {!editing ? (
            <button onClick={() => { setEditing(true); setMsg(""); setError(""); }}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
              <Pencil className="w-3 h-3" /> Edit
            </button>
          ) : (
            <button onClick={() => { setEditing(false); setForm(initial); setError(""); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <X className="w-3 h-3" /> Cancel
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-3">
        {msg && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
            <Check className="w-4 h-4" /> {msg}
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {field("phone",   "Phone Number", "+91 98765 43210")}
          {field("address", "Address",      "House/Street, City, State")}
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Bank / Payout Details</p>
        <div className="grid grid-cols-2 gap-3">
          {field("bankName",    "Bank Name",       "e.g. SBI")}
          {field("bankAccount", "Account Number",  "Account number")}
          {field("ifscCode",    "IFSC Code",       "e.g. SBIN0001234")}
          {field("upiId",       "UPI ID",          "e.g. name@upi")}
        </div>

        {editing && (
          <Button onClick={save} disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm mt-2">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
