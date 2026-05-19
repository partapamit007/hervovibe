"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

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

interface Sale {
  id: string;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
  member: { name: string; memberId: string | null; rank: string };
}

export default function TeamSalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sales?enteredById=me")
      .then((r) => r.json())
      .then((d) => {
        setSales(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  const totalAmount = sales.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All sales you have entered
        </p>
      </div>

      {/* Summary */}
      {!loading && sales.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalAmount.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-gray-500">
              Total from {sales.length} sale{sales.length !== 1 ? "s" : ""} entered
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            {loading ? "Loading..." : `${sales.length} sale${sales.length !== 1 ? "s" : ""}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Loading sales...
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                You have not entered any sales yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sales.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between py-3 ${
                    i % 2 === 0 ? "" : "bg-gray-50/60"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.member.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.member.memberId ?? "—"} &middot;{" "}
                      {months[s.month - 1]} {s.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={`text-xs ${rankColors[s.member.rank] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {s.member.rank.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm font-bold text-green-600">
                      ₹{s.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
