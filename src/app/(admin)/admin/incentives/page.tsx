"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, TrendingUp, IndianRupee, Settings, Info } from "lucide-react";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface CommissionRecord {
  id: string; type: string; amount: number; depth: number;
  month: number; year: number; fromMemberId: string;
  member: { name: string; memberId: string };
}
interface PiRate { id: string; month: number; year: number; ratePerPoint: number; }
interface BiConfig { id: string; baseRate: number; }

const commTypeColor: Record<string, string> = {
  BUSINESS: "bg-blue-100 text-blue-700",
  PI:       "bg-green-100 text-green-700",
  BI:       "bg-purple-100 text-purple-700",
};

export default function IncentivesPage() {
  const now = new Date();
  const [tab, setTab] = useState<"pi" | "bi" | "pirate" | "commissions">("pi");

  // Commission records for PI / BI tabs
  const [piRecords, setPiRecords] = useState<CommissionRecord[]>([]);
  const [biRecords, setBiRecords] = useState<CommissionRecord[]>([]);
  const [piMonth, setPiMonth] = useState(String(now.getMonth() + 1));
  const [piYear, setPiYear]   = useState(String(now.getFullYear()));
  const [biMonth, setBiMonth] = useState(String(now.getMonth() + 1));
  const [biYear, setBiYear]   = useState(String(now.getFullYear()));

  // BI Config
  const [biConfig, setBiConfig]     = useState<BiConfig | null>(null);
  const [biRateInput, setBiRateInput] = useState("");
  const [biRateSaving, setBiRateSaving] = useState(false);
  const [biRateEditing, setBiRateEditing] = useState(false);

  // PI Rate form
  const [piRates, setPiRates]     = useState<PiRate[]>([]);
  const [rateMonth, setRateMonth] = useState(String(now.getMonth() + 1));
  const [rateYear, setRateYear]   = useState(String(now.getFullYear()));
  const [rateValue, setRateValue] = useState("");
  const [rateLoading, setRateLoading] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // All commissions tab
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [commMonth, setCommMonth] = useState(String(now.getMonth() + 1));
  const [commYear, setCommYear]   = useState(String(now.getFullYear()));

  const [status, setStatus]     = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  function showStatus(type: "success" | "error", msg: string) {
    setStatus(type); setStatusMsg(msg);
    setTimeout(() => setStatus("idle"), 5000);
  }

  useEffect(() => {
    loadBiConfig();
    loadPiRates();
    loadPiRecords();
  }, []);

  function loadPiRecords(m = piMonth, y = piYear) {
    fetch(`/api/commissions?type=PI&month=${m}&year=${y}`)
      .then((r) => r.json()).then((d) => setPiRecords(Array.isArray(d) ? d : []));
  }
  function loadBiRecords(m = biMonth, y = biYear) {
    fetch(`/api/commissions?type=BI&month=${m}&year=${y}`)
      .then((r) => r.json()).then((d) => setBiRecords(Array.isArray(d) ? d : []));
  }
  function loadBiConfig() {
    fetch("/api/bi-config").then((r) => r.json()).then((d) => {
      if (d && d.baseRate !== undefined) {
        setBiConfig(d);
        setBiRateInput(String(d.baseRate));
      }
    });
  }
  function loadPiRates() {
    fetch("/api/pi-rate").then((r) => r.json()).then((d) => setPiRates(Array.isArray(d) ? d : []));
  }
  function loadCommissions(m: string, y: string) {
    fetch(`/api/commissions?month=${m}&year=${y}`)
      .then((r) => r.json()).then((d) => setCommissions(Array.isArray(d) ? d : []));
  }

  async function saveBiRate() {
    setBiRateSaving(true);
    const res = await fetch("/api/bi-config", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseRate: biRateInput }),
    });
    if (res.ok) {
      const d = await res.json();
      setBiConfig(d);
      setBiRateEditing(false);
      showStatus("success", `BI base rate updated to ${d.baseRate}%`);
    } else {
      const err = await res.json();
      showStatus("error", err.error || "Failed to save");
    }
    setBiRateSaving(false);
  }

  async function handlePiRateSubmit(e: React.FormEvent) {
    e.preventDefault(); setRateLoading(true);
    const res = await fetch("/api/pi-rate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: rateMonth, year: rateYear, ratePerPoint: rateValue }),
    });
    if (res.ok) { showStatus("success", "PI rate saved."); setRateValue(""); loadPiRates(); }
    else { const err = await res.json(); showStatus("error", err.error || "Failed"); }
    setRateLoading(false);
  }

  async function deletePiRate(id: string) {
    if (!confirm("Delete this rate?")) return;
    setDeleting(id);
    await fetch("/api/pi-rate", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadPiRates(); setDeleting(null);
  }

  const tabClass = (t: string) =>
    `px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
      tab === t ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  // Group commissions by member
  const commByMember = commissions.reduce<Record<string, { name: string; memberId: string; business: number; pi: number; bi: number; total: number }>>((acc, c) => {
    if (!acc[c.member.memberId]) acc[c.member.memberId] = { name: c.member.name, memberId: c.member.memberId, business: 0, pi: 0, bi: 0, total: 0 };
    if (c.type === "BUSINESS") acc[c.member.memberId].business += c.amount;
    if (c.type === "PI")       acc[c.member.memberId].pi       += c.amount;
    if (c.type === "BI")       acc[c.member.memberId].bi       += c.amount;
    acc[c.member.memberId].total += c.amount;
    return acc;
  }, {});
  const commSummary = Object.values(commByMember).sort((a, b) => b.total - a.total);

  // Group PI records by member
  const piByMember = piRecords.reduce<Record<string, { name: string; memberId: string; total: number; depth0: number }>>((acc, c) => {
    const key = c.member.memberId;
    if (!acc[key]) acc[key] = { name: c.member.name, memberId: key, total: 0, depth0: 0 };
    acc[key].total += c.amount;
    if (c.depth === 0) acc[key].depth0 += c.amount;
    return acc;
  }, {});
  const piSummary = Object.values(piByMember).sort((a, b) => b.total - a.total);

  // Group BI records by member
  const biByMember = biRecords.reduce<Record<string, { name: string; memberId: string; total: number }>>((acc, c) => {
    const key = c.member.memberId;
    if (!acc[key]) acc[key] = { name: c.member.name, memberId: key, total: 0 };
    acc[key].total += c.amount;
    return acc;
  }, {});
  const biSummary = Object.values(biByMember).sort((a, b) => b.total - a.total);

  const baseRate = biConfig?.baseRate ?? 1;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Incentives</h1>
        <p className="text-sm text-gray-500 mt-0.5">Auto-calculated PI &amp; BI from sales · Configure rates · View commissions</p>
      </div>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button onClick={() => { setTab("pi"); loadPiRecords(); }} className={tabClass("pi")}>Product Incentive (PI)</button>
        <button onClick={() => { setTab("bi"); loadBiRecords(); }} className={tabClass("bi")}>Business Incentive (BI)</button>
        <button onClick={() => setTab("pirate")} className={tabClass("pirate")}>PI Rate (₹/pt)</button>
        <button onClick={() => { setTab("commissions"); loadCommissions(commMonth, commYear); }} className={tabClass("commissions")}>
          All Commissions
        </button>
      </div>

      {status === "success" && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-5">
          <CheckCircle className="w-4 h-4 shrink-0" />{statusMsg}
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
          <XCircle className="w-4 h-4 shrink-0" />{statusMsg}
        </div>
      )}

      {/* PI TAB */}
      {tab === "pi" && (
        <>
          <div className="flex gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 text-sm">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
            <div className="text-green-800">
              <p className="font-semibold mb-0.5">PI is auto-calculated on every sale</p>
              <p className="text-xs leading-relaxed text-green-700">
                PI = <strong>10% of MRP</strong> for each sale. The <strong>seller keeps the full PI amount</strong>. All upline members share an <strong>equal split</strong> of the same amount. No manual entry needed — records appear here automatically when sales are added.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mb-5 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select value={piMonth} onChange={(e) => setPiMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select value={piYear} onChange={(e) => setPiYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button variant="outline" onClick={() => loadPiRecords(piMonth, piYear)} className="text-sm">Load</Button>
          </div>

          {piSummary.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No PI commissions for this period. Add sales to generate PI.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PI Commissions — {months[parseInt(piMonth) - 1]} {piYear}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">{piSummary.length} members earned PI</p>
                <div className="divide-y divide-gray-100">
                  {piSummary.map((m) => (
                    <div key={m.memberId} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">
                          [{m.memberId}]
                          {m.depth0 > 0 && <span className="ml-2 text-green-600">Direct: ₹{m.depth0.toFixed(2)}</span>}
                          {m.total - m.depth0 > 0 && <span className="ml-2 text-blue-600">Upline split: ₹{(m.total - m.depth0).toFixed(2)}</span>}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-green-700">₹{m.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* BI TAB */}
      {tab === "bi" && (
        <>
          {/* BI Rate Config */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-600" /> BI Formula Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 mb-4 text-sm">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-purple-500" />
                <div className="text-purple-800 text-xs leading-relaxed">
                  <p className="font-semibold mb-0.5">Auto-calculated on every sale — no manual entry needed</p>
                  <p>
                    Current formula: L1 = <strong>{baseRate}%</strong> of sale · L2 = <strong>{(baseRate / 2).toFixed(3)}%</strong> · L3 = <strong>{(baseRate / 4).toFixed(3)}%</strong> · keeps halving up the full chain.
                  </p>
                </div>
              </div>

              {!biRateEditing ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Current BI Base Rate (Level 1)</p>
                    <p className="text-2xl font-bold text-purple-700">{baseRate}%</p>
                  </div>
                  <Button variant="outline" onClick={() => { setBiRateInput(String(baseRate)); setBiRateEditing(true); }}>
                    Change Rate
                  </Button>
                </div>
              ) : (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">New Base Rate (%)</label>
                    <input
                      type="number" min="0.01" max="100" step="0.01"
                      value={biRateInput}
                      onChange={(e) => setBiRateInput(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {biRateInput && parseFloat(biRateInput) > 0 && (
                      <p className="text-xs text-purple-600 mt-1">
                        Formula: L1={parseFloat(biRateInput).toFixed(2)}% · L2={( parseFloat(biRateInput)/2).toFixed(3)}% · L3={(parseFloat(biRateInput)/4).toFixed(3)}% · ...
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pb-0.5">
                    <Button onClick={saveBiRate} disabled={biRateSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {biRateSaving ? "Saving..." : "Save"}
                    </Button>
                    <Button variant="outline" onClick={() => setBiRateEditing(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BI Commission History */}
          <div className="flex gap-3 mb-5 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select value={biMonth} onChange={(e) => setBiMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select value={biYear} onChange={(e) => setBiYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button variant="outline" onClick={() => loadBiRecords(biMonth, biYear)} className="text-sm">Load</Button>
          </div>

          {biSummary.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No BI commissions for this period. Add sales to generate BI.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">BI Commissions — {months[parseInt(biMonth) - 1]} {biYear}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">{biSummary.length} members earned BI</p>
                <div className="divide-y divide-gray-100">
                  {biSummary.map((m) => (
                    <div key={m.memberId} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">[{m.memberId}]</p>
                      </div>
                      <span className="text-sm font-bold text-purple-700">₹{m.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* PI RATE TAB */}
      {tab === "pirate" && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-green-600" /> Set Monthly PI Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500 mb-4">
                The PI rate converts accumulated PI points into ₹ payout for each month.
                e.g. if rate = ₹2/pt and a member has 500 points → they earn ₹1,000.
              </p>
              <form onSubmit={handlePiRateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Month</label>
                    <select value={rateMonth} onChange={(e) => setRateMonth(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Year</label>
                    <select value={rateYear} onChange={(e) => setRateYear(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate (₹ per point)</label>
                  <input type="number" min="0.01" step="0.01" value={rateValue} onChange={(e) => setRateValue(e.target.value)} required
                    placeholder="e.g. 2.00"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <Button type="submit" disabled={rateLoading} className="bg-green-600 hover:bg-green-700 text-white">
                  {rateLoading ? "Saving..." : "Save Rate"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">PI Rate History</CardTitle></CardHeader>
            <CardContent>
              {piRates.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No rates set yet</p> : (
                <div className="divide-y divide-gray-100">
                  {piRates.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-3">
                      <p className="text-sm text-gray-800">{months[r.month - 1]} {r.year}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-green-700">₹{r.ratePerPoint}/pt</span>
                        <button onClick={() => deletePiRate(r.id)} disabled={deleting === r.id} className="text-gray-400 hover:text-red-500">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ALL COMMISSIONS TAB */}
      {tab === "commissions" && (
        <>
          <div className="flex gap-3 mb-5 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select value={commMonth} onChange={(e) => setCommMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {months.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <select value={commYear} onChange={(e) => setCommYear(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <Button variant="outline" onClick={() => loadCommissions(commMonth, commYear)} className="text-sm">Load</Button>
          </div>

          {commissions.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <TrendingUp className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No commissions for this period</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">{commSummary.length} members · {commissions.length} records</p>
              <Card>
                <CardContent className="pt-4">
                  <div className="divide-y divide-gray-100">
                    {commSummary.map((m) => (
                      <div key={m.memberId} className="py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-500">[{m.memberId}]</p>
                          </div>
                          <span className="text-sm font-bold text-green-700">₹{m.total.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          {m.business > 0 && <Badge className="text-xs bg-blue-100 text-blue-700">Business ₹{m.business.toFixed(2)}</Badge>}
                          {m.pi > 0 && <Badge className="text-xs bg-green-100 text-green-700">PI ₹{m.pi.toFixed(2)}</Badge>}
                          {m.bi > 0 && <Badge className="text-xs bg-purple-100 text-purple-700">BI ₹{m.bi.toFixed(2)}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
