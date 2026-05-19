"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const rankColors: Record<string, string> = {
  DISTRIBUTOR: "bg-gray-100 text-gray-700",
  BRONZE: "bg-amber-100 text-amber-700",
  SILVER: "bg-slate-100 text-slate-700",
  SILVER_A: "bg-slate-200 text-slate-800",
  SILVER_B: "bg-slate-300 text-slate-900",
  GOLDEN: "bg-yellow-100 text-yellow-700",
  DIAMOND: "bg-blue-100 text-blue-700",
  SUPER_DIAMOND: "bg-blue-200 text-blue-800",
  PLATINUM: "bg-purple-100 text-purple-700",
  CENTENNIAL: "bg-green-100 text-green-700",
};

export default function MemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/members/${id}`).then(r => r.json()).then(d => { setMember(d); setLoading(false); });
  }, [id]);

  async function toggleStatus() {
    const newStatus = member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setMember({ ...member, status: newStatus });
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;
  if (!member) return <div className="text-center py-12 text-gray-400">Member not found</div>;

  const totalSales = member.salesEntries?.reduce((s: number, e: any) => s + e.amount, 0) || 0;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-2xl">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{member.name}</h1>
            <p className="text-gray-500 text-sm">{member.memberId}</p>
            <div className="flex gap-2 mt-1">
              <Badge className={`text-xs ${rankColors[member.rank]}`}>{member.rank.replace("_", " ")}</Badge>
              <Badge className={`text-xs ${member.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {member.status}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          onClick={toggleStatus}
          variant="outline"
          size="sm"
          className={member.status === "ACTIVE" ? "text-red-600 border-red-200" : "text-green-600 border-green-200"}
        >
          {member.status === "ACTIVE" ? "Deactivate" : "Activate"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-800 truncate">{member.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-800">{member.phone || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Sponsor</p>
            <p className="text-sm font-medium text-gray-800">{member.sponsor?.name || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Sales</p>
            <p className="text-sm font-bold text-green-600">₹{totalSales.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-sm">Downline ({member.downline?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {member.downline?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No downline members</p>
          ) : (
            <div className="space-y-2">
              {member.downline?.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.memberId}</p>
                  </div>
                  <Badge className={`text-xs ${rankColors[d.rank]}`}>{d.rank.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {member.salesEntries?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">No sales yet</p>
          ) : (
            <div className="space-y-2">
              {member.salesEntries?.map((s: any) => (
                <div key={s.id} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-600">{s.month}/{s.year}</span>
                  <span className="text-sm font-medium text-green-600">₹{s.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
