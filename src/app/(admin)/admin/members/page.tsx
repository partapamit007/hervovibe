"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, AlertTriangle } from "lucide-react";
import { idColorStyles, type IdColor } from "@/lib/idColor";

const rankOrder = ["DISTRIBUTOR","BRONZE","SILVER","GOLDEN","DIAMOND","SUPER_DIAMOND","PLATINUM","CENTENNIAL"];

const rankColors: Record<string, string> = {
  DISTRIBUTOR:   "bg-gray-100 text-gray-700",
  BRONZE:        "bg-amber-100 text-amber-700",
  SILVER:        "bg-slate-100 text-slate-700",
  GOLDEN:        "bg-yellow-100 text-yellow-700",
  DIAMOND:       "bg-blue-100 text-blue-700",
  SUPER_DIAMOND: "bg-blue-200 text-blue-800",
  PLATINUM:      "bg-purple-100 text-purple-700",
  CENTENNIAL:    "bg-green-100 text-green-700",
};
const statusColors: Record<string, string> = {
  ACTIVE:    "bg-green-100 text-green-700",
  INACTIVE:  "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function MembersPage() {
  const [members,    setMembers]    = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [rankFilter, setRankFilter] = useState("");
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { fetchMembers(1); }, [search, rankFilter]);

  async function fetchMembers(p: number) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (search)     params.set("search", search);
    if (rankFilter) params.set("rank",   rankFilter);
    const res  = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setPage(p);
    setLoading(false);
  }

  function exportCSV() {
    window.location.href = "/api/export/members";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Members</h1>
          <p className="text-gray-500 text-sm">{total} total members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="flex items-center gap-1.5 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Link href="/admin/members/new">
            <Button className="bg-green-600 hover:bg-green-700">+ Add Member</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="Search name, ID, phone..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={rankFilter}
          onChange={(e) => setRankFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Ranks</option>
          {Object.keys(rankColors).map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No members found</div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {members.map((m) => (
              <Link key={m.id} href={`/admin/members/${m.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          {m.idColor && (
                            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white text-[8px] flex items-center justify-center font-bold ${idColorStyles[m.idColor as IdColor]}`}>
                              {(m.idColor as string)[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.memberId} · {m.phone || m.email}</p>
                          {m.sponsor && (
                            <p className="text-xs text-gray-400">Sponsor: {m.sponsor.name} ({m.sponsor.memberId})</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          {rankOrder.indexOf(m.rank) > 0 && m._count.downline < 5 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <Badge className={`text-xs ${rankColors[m.rank]}`}>{m.rank.replace(/_/g, " ")}</Badge>
                        </div>
                        <Badge className={`text-xs ${statusColors[m.status]}`}>{m.status}</Badge>
                        <span className={`text-xs font-medium ${m._count.downline >= 5 ? "text-green-600" : m._count.downline > 0 ? "text-amber-600" : "text-gray-400"}`}>
                          {m._count.downline >= 5 ? `✓ ${m._count.downline} members` : `${m._count.downline}/5 min`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => fetchMembers(page - 1)}>
                ← Prev
              </Button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => fetchMembers(page + 1)}>
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
