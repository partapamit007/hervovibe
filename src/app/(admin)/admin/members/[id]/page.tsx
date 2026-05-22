"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound, CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";

const rankOrder = ["DISTRIBUTOR","BRONZE","SILVER","GOLDEN","DIAMOND","SUPER_DIAMOND","PLATINUM","CENTENNIAL"];
const rankTargets: Record<string, number> = {
  DISTRIBUTOR:   1800,
  BRONZE:        9000,
  SILVER:        45000,
  GOLDEN:        225000,
  DIAMOND:       1125000,
  SUPER_DIAMOND: 5625000,
  PLATINUM:      28125000,
  CENTENNIAL:    140625000,
};

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

export default function MemberDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resetStatus, setResetStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    fetch(`/api/members/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setMember(d);
        setLoading(false);
      });
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

  async function handleResetPassword() {
    if (
      !confirm(
        `Reset password for ${member.name}? Their new password will be Member@123`
      )
    )
      return;
    setResetStatus("loading");
    try {
      const res = await fetch(`/api/members/${id}/reset-password`, {
        method: "POST",
      });
      if (res.ok) {
        setResetStatus("success");
        setResetMsg("Password reset to Member@123 successfully.");
      } else {
        setResetStatus("error");
        setResetMsg("Failed to reset password. Please try again.");
      }
    } catch {
      setResetStatus("error");
      setResetMsg("Network error. Please try again.");
    }
    setTimeout(() => setResetStatus("idle"), 4000);
  }

  async function handleDelete() {
    if (!confirm(`Delete ${member.name}? This will hide them from the system. This cannot be undone.`)) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/members");
  }

  if (loading)
    return (
      <div className="text-center py-12 text-gray-400">Loading...</div>
    );
  if (!member)
    return (
      <div className="text-center py-12 text-gray-400">Member not found</div>
    );

  const totalSales = member.salesEntries?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
  const downlineCount = member.downline?.length || 0;
  const rankIdx = rankOrder.indexOf(member.rank);

  const meetsDownline = rankIdx === 0 || downlineCount >= 5;
  const meetsTarget   = totalSales >= (rankTargets[member.rank] || 0);
  const rankMismatch  = rankIdx > 0 && (!meetsDownline || !meetsTarget);

  let qualifiedRank = "DISTRIBUTOR";
  for (const r of rankOrder) {
    const reqTarget = rankTargets[r] || 0;
    const needsDownline = rankOrder.indexOf(r) > 0;
    if (totalSales >= reqTarget && (!needsDownline || downlineCount >= 5)) {
      qualifiedRank = r;
    }
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Reset password feedback */}
      {resetStatus === "success" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {resetMsg}
        </div>
      )}
      {resetStatus === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          <XCircle className="w-4 h-4 shrink-0" />
          {resetMsg}
        </div>
      )}

      {/* Rank mismatch warning */}
      {rankMismatch && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3 mb-5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Rank does not match qualifications</p>
            <ul className="mt-1 space-y-0.5 text-amber-700">
              {!meetsDownline && (
                <li>• Needs <strong>5 direct downline members</strong> — currently has {downlineCount}</li>
              )}
              {!meetsTarget && (
                <li>• Needs <strong>₹{(rankTargets[member.rank] || 0).toLocaleString("en-IN")} total sales</strong> for {member.rank.replace(/_/g, " ")} — currently ₹{totalSales.toLocaleString("en-IN")}</li>
              )}
            </ul>
            <p className="mt-1 text-xs text-amber-600">
              Based on current data, this member qualifies for: <strong>{qualifiedRank.replace(/_/g, " ")}</strong>.
              The rank engine (Phase 4) will auto-correct this monthly.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
            <p className="text-gray-500 text-sm">{member.memberId}</p>
            <div className="flex gap-2 mt-1">
              <Badge className={`text-xs ${rankColors[member.rank]}`}>
                {member.rank.replace(/_/g, " ")}
              </Badge>
              <Badge
                className={`text-xs ${
                  member.status === "ACTIVE"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {member.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={() => router.push(`/admin/members/${id}/edit`)}
            variant="outline"
            size="sm"
          >
            Edit
          </Button>
          <Button
            onClick={toggleStatus}
            variant="outline"
            size="sm"
            className={
              member.status === "ACTIVE"
                ? "text-red-600 border-red-200 hover:bg-red-50"
                : "text-green-600 border-green-200 hover:bg-green-50"
            }
          >
            {member.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </Button>
          <Button
            onClick={handleResetPassword}
            variant="outline"
            size="sm"
            disabled={resetStatus === "loading"}
            className="text-amber-600 border-amber-200 hover:bg-amber-50 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {resetStatus === "loading" ? "Resetting..." : "Reset Password"}
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-800 truncate">
              {member.email}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-medium text-gray-800">
              {member.phone || "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Sponsor</p>
            {member.sponsor ? (
              <p className="text-sm font-medium text-gray-800">
                {member.sponsor.name}
                <span className="text-xs text-gray-400 ml-1">({member.sponsor.memberId})</span>
              </p>
            ) : (
              <p className="text-sm font-medium text-gray-400 italic">Direct Member</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Date Started</p>
            <p className="text-sm font-medium text-gray-800">
              {new Date(member.joiningDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Sales (All Time)</p>
            <p className="text-sm font-bold text-green-600">
              ₹{totalSales.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Direct Downline ({member.downline?.length || 0} members)
            </CardTitle>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                member.downline?.length >= 5
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {member.downline?.length >= 5
                ? "Min. met"
                : `${5 - (member.downline?.length || 0)} more for min`}
            </span>
          </div>
          <div className="flex gap-1 mt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < (member.downline?.length || 0)
                    ? "bg-green-500"
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {member.downline?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No downline members
            </p>
          ) : (
            <div className="space-y-2">
              {member.downline?.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.memberId}</p>
                  </div>
                  <Badge className={`text-xs ${rankColors[d.rank]}`}>
                    {d.rank.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KYC & Identity */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-sm">KYC &amp; Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">PAN Number</p>
              <p className="text-sm font-medium text-gray-800">{member.panNumber || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Aadhaar Number</p>
              <p className="text-sm font-medium text-gray-800">{member.aadhaarNumber || "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Address</p>
            <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">{member.address || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card className="mb-5">
        <CardHeader>
          <CardTitle className="text-sm">Bank / Payout Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500">Bank Name</p>
              <p className="text-sm font-medium text-gray-800">{member.bankName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Account Number</p>
              <p className="text-sm font-medium text-gray-800">{member.bankAccount || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">IFSC Code</p>
              <p className="text-sm font-medium text-gray-800">{member.ifscCode || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">UPI ID</p>
              <p className="text-sm font-medium text-gray-800">{member.upiId || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {member.salesEntries?.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No sales yet
            </p>
          ) : (
            <div className="space-y-2">
              {member.salesEntries?.map((s: any) => (
                <div
                  key={s.id}
                  className="flex justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-600">
                    {s.month}/{s.year}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    ₹{s.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
