"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Trash2, ChevronDown, ChevronUp, Copy, Check, X } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { managedUsers: number };
}

interface ManagedDistributor {
  id: string;
  name: string;
  memberId: string | null;
  rank: string;
  phone: string | null;
}

const rankColors: Record<string, string> = {
  DISTRIBUTOR:   "bg-gray-100 text-gray-700",
  BRONZE:        "bg-amber-100 text-amber-700",
  SILVER:        "bg-slate-100 text-slate-600",
  GOLDEN:        "bg-yellow-100 text-yellow-700",
  DIAMOND:       "bg-blue-100 text-blue-700",
  SUPER_DIAMOND: "bg-blue-200 text-blue-800",
  PLATINUM:      "bg-purple-100 text-purple-700",
  CENTENNIAL:    "bg-green-100 text-green-700",
};

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedMembers, setExpandedMembers] = useState<Record<string, ManagedDistributor[]>>({});
  const [expandedLoading, setExpandedLoading] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [copied, setCopied] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team-members");
    const data = await res.json();
    setTeamMembers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (expandedMembers[id]) return;
    setExpandedLoading(id);
    const res = await fetch(`/api/members?all=1&managedBy=${id}`);
    const data = await res.json();
    setExpandedMembers((prev) => ({ ...prev, [id]: Array.isArray(data) ? data : [] }));
    setExpandedLoading(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError("");
    const res = await fetch("/api/team-members", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setNewPwd(data.tempPassword ?? "");
      setForm({ name: "", email: "", phone: "" });
      await load();
    } else {
      setAddError(data.error || "Failed to add team member");
    }
    setAddLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name} from team? Their assigned members will be unassigned.`)) return;
    setDeletingId(id);
    await fetch("/api/team-members", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeletingId(null);
    if (expanded === id) setExpanded(null);
    await load();
  }

  function copyPwd() {
    navigator.clipboard.writeText(newPwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sub-admins who record sales for assigned distributors</p>
        </div>
        <Button onClick={() => { setShowAdd(true); setNewPwd(""); setAddError(""); }}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Team Member
        </Button>
      </div>

      {/* New password banner */}
      {newPwd && (
        <div className="mb-4 p-4 bg-green-50 border border-green-300 rounded-xl">
          <p className="text-sm font-semibold text-green-800 mb-1">Team member added successfully!</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-green-700">Temporary password:</span>
            <code className="font-mono font-bold bg-white border border-green-300 px-2 py-0.5 rounded text-green-900 text-sm">
              {newPwd}
            </code>
            <button onClick={copyPwd}
              className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 border border-green-300 rounded px-2 py-0.5 bg-white">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={() => setNewPwd("")} className="ml-auto text-green-600 hover:text-green-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add form modal */}
      {showAdd && (
        <Card className="mb-5 border-blue-200 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-base font-semibold text-gray-800">Add New Team Member</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <form onSubmit={handleAdd} className="space-y-3">
              {addError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{addError}</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="priya@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="w-1/2 pr-1.5">
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={addLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm">
                  {addLoading ? "Adding..." : "Add Team Member"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="text-sm">
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team members list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : teamMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No team members yet</p>
            <p className="text-sm text-gray-400 mt-1">Add team members to let them record sales for distributors</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teamMembers.map((tm) => {
            const isOpen = expanded === tm.id;
            const isLoadingMembers = expandedLoading === tm.id;
            const assignedMembers = expandedMembers[tm.id] ?? [];

            return (
              <Card key={tm.id} className={`transition-all ${isOpen ? "border-blue-200 shadow-sm" : ""}`}>
                <CardContent className="p-0">
                  {/* Team member row */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                      {tm.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{tm.name}</p>
                      <p className="text-xs text-gray-500">{tm.email}{tm.phone ? ` · ${tm.phone}` : ""}</p>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 text-xs shrink-0">
                      {tm._count.managedUsers} member{tm._count.managedUsers !== 1 ? "s" : ""}
                    </Badge>
                    <button onClick={() => toggleExpand(tm.id)}
                      className="text-gray-400 hover:text-gray-700 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(tm.id, tm.name)}
                      disabled={deletingId === tm.id}
                      className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expanded: assigned distributors */}
                  {isOpen && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                        Assigned Distributors
                      </p>
                      {isLoadingMembers ? (
                        <p className="text-xs text-gray-400">Loading...</p>
                      ) : assignedMembers.length === 0 ? (
                        <p className="text-xs text-gray-400">No distributors assigned to this team member yet. Assign via Members → Edit.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {assignedMembers.map((m) => (
                            <div key={m.id}
                              className="flex items-center gap-3 py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
                              <span className="text-gray-800 font-medium">{m.name}</span>
                              {m.memberId && <span className="text-gray-400 text-xs">{m.memberId}</span>}
                              <Badge className={`text-xs ml-auto ${rankColors[m.rank] ?? "bg-gray-100 text-gray-600"}`}>
                                {m.rank.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats summary */}
      {teamMembers.length > 0 && (
        <div className="mt-4 text-xs text-gray-400 text-center">
          {teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""} ·{" "}
          {teamMembers.reduce((s, t) => s + t._count.managedUsers, 0)} distributors assigned
        </div>
      )}
    </div>
  );
}
