"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, CheckCircle2, Info, X } from "lucide-react";

const fmt = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

interface Asset {
  id: string; assetCode: string; name: string;
  purchaseDate: string; purchaseCost: string; residualValue: string;
  category: { name: string; usefulLifeCompaniesAct: number };
  itActBlock: { id: string; name: string; rate: number; code: string } | null;
}

interface DepreciationRecord {
  id: string; financialYear: string;
  openingWDV: string; companiesActDepreciation: string; companiesActClosingWDV: string;
  itActDepreciation: string; itActClosingWDV: string; halfYearRule: boolean;
  asset: {
    assetCode: string; name: string; purchaseDate: string; purchaseCost: string;
    category: { name: string; usefulLifeCompaniesAct: number };
    itActBlock: { id: string; name: string; rate: number; code: string } | null;
  };
}

interface ItActBlock {
  id: string; code: string; name: string; rate: number;
}

interface RunResult {
  fy: string; processed: number; priorYearsAutoFilled: number; notApplicable: number;
}

interface Props {
  assets: Asset[];
  records: DepreciationRecord[];
  itActBlocks: ItActBlock[];
  fyList: string[];
  selectedFY: string;
  defaultAssetId?: string;
}

export function DepreciationClient({ assets, records, itActBlocks, fyList, selectedFY }: Props) {
  const router = useRouter();
  const [fy, setFY] = useState(selectedFY);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  async function runDepreciation() {
    setRunning(true);
    setLastRun(null);
    try {
      const res = await fetch("/api/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialYear: fy }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLastRun({ fy, processed: data.processed, priorYearsAutoFilled: data.priorYearsAutoFilled ?? 0, notApplicable: data.notApplicable ?? 0 });
      if (data.processed > 0) toast.success(`FY ${fy}: calculated for ${data.processed} asset${data.processed !== 1 ? "s" : ""}`);
      else toast.info(`No assets to process for FY ${fy}`);
      router.refresh();
    } catch { toast.error("Failed to run depreciation"); }
    finally { setRunning(false); }
  }

  // ── CA totals ──────────────────────────────────────────────────────────────
  const caTotals = records.reduce(
    (a, r) => ({ opening: a.opening + Number(r.openingWDV), dep: a.dep + Number(r.companiesActDepreciation), closing: a.closing + Number(r.companiesActClosingWDV) }),
    { opening: 0, dep: 0, closing: 0 }
  );

  // ── IT Act block-wise aggregation (like Excel Sheet 2) ─────────────────────
  // For each block: sum openingWDV, itActDepreciation, itActClosingWDV across all records in that block
  // "Additions" = assets whose purchaseDate falls in this FY (opening WDV = purchaseCost for those)
  const [fyStartYear] = fy.split("-").map(Number);
  const fyStart = new Date(fyStartYear, 3, 1); // April 1
  const fyEnd = new Date(fyStartYear + 1, 2, 31); // March 31

  const blockAgg = records.reduce<Record<string, {
    block: ItActBlock; opening: number; additions: number; disposal: number;
    dep: number; closing: number; halfYearCount: number; count: number;
  }>>((acc, r) => {
    const block = r.asset.itActBlock;
    if (!block) return acc;
    const purchaseDate = new Date(r.asset.purchaseDate);
    const isNewInFY = purchaseDate >= fyStart && purchaseDate <= fyEnd;
    const opening = Number(r.openingWDV);
    const additions = isNewInFY ? Number(r.asset.purchaseCost) : 0;

    if (!acc[block.id]) {
      acc[block.id] = { block, opening: 0, additions: 0, disposal: 0, dep: 0, closing: 0, halfYearCount: 0, count: 0 };
    }
    acc[block.id].opening += opening;
    acc[block.id].additions += additions;
    acc[block.id].dep += Number(r.itActDepreciation);
    acc[block.id].closing += Number(r.itActClosingWDV);
    if (r.halfYearRule) acc[block.id].halfYearCount++;
    acc[block.id].count++;
    return acc;
  }, {});

  const blockRows = Object.values(blockAgg).sort((a, b) => a.block.rate - b.block.rate);
  const itTotals = blockRows.reduce((a, b) => ({ opening: a.opening + b.opening, additions: a.additions + b.additions, dep: a.dep + b.dep, closing: a.closing + b.closing }), { opening: 0, additions: 0, dep: 0, closing: 0 });

  const earliestFY = assets.reduce<string | null>((min, a) => {
    const d = new Date(a.purchaseDate);
    const year = d.getFullYear(); const month = d.getMonth();
    const firstFY = month >= 3 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;
    return !min ? firstFY : firstFY < min ? firstFY : min;
  }, null);

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Depreciation</h1>
        <p className="text-sm text-gray-500">Select target FY and click Run — prior years are auto-calculated</p>
      </div>
      <div className="flex items-center gap-3">
        <Select value={fy} onValueChange={(v: string | null) => { if (v) { setFY(v); setLastRun(null); router.push(`/depreciation?fy=${v}`); } }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{[...fyList].reverse().map(f => <SelectItem key={f} value={f}>FY {f}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={runDepreciation} disabled={running} className="bg-orange-500 hover:bg-orange-600 whitespace-nowrap">
          <Play className="w-4 h-4 mr-2" />{running ? "Running…" : `Run FY ${fy}`}
        </Button>
      </div>
    </div>
  );

  const runResultPanel = lastRun && (
    <div className="rounded-xl border bg-white overflow-hidden mb-6">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <p className="text-sm font-semibold text-gray-700">Run result — FY {lastRun.fy}</p>
        <button onClick={() => setLastRun(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 space-y-2">
        {lastRun.processed > 0 && (
          <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2.5">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span><strong>{lastRun.processed} asset{lastRun.processed !== 1 ? "s" : ""}</strong> calculated for FY {lastRun.fy}.
              {lastRun.priorYearsAutoFilled > 0 && <span className="text-green-600"> ({lastRun.priorYearsAutoFilled} prior-year records auto-filled.)</span>}
            </span>
          </div>
        )}
        {lastRun.processed === 0 && (
          <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>No assets active in FY {lastRun.fy}{lastRun.notApplicable > 0 ? ` (${lastRun.notApplicable} purchased after this FY)` : ""}.</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-0">
      {header}
      {runResultPanel}

      <Tabs defaultValue="ca">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="ca" className="px-5 py-2.5 text-sm">
            Companies Act 2013 — SLM
          </TabsTrigger>
          <TabsTrigger value="it" className="px-5 py-2.5 text-sm">
            Income Tax Act — Block of Assets (WDV)
          </TabsTrigger>
        </TabsList>

        {/* ── COMPANIES ACT TAB ──────────────────────────────────────────────── */}
        <TabsContent value="ca">
          {records.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[{ label: "Opening WDV", value: caTotals.opening }, { label: "Depreciation (CA)", value: caTotals.dep }, { label: "Closing WDV", value: caTotals.closing }].map(item => (
                <Card key={item.label}><CardContent className="p-4">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{fmt(item.value)}</p>
                </CardContent></Card>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 bg-orange-50 border-b">
              <p className="text-xs text-orange-700 font-medium">Schedule II, Companies Act 2013 · Straight Line Method (SLM) · Depreciation = (Cost − Residual Value) ÷ Useful Life · Pro-rated for days in service</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[750px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">CA Category</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Life</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Opening WDV</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Depreciation</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Closing WDV</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr><td colSpan={6} className="py-14 text-center text-gray-400">
                      <p>No records for FY {fy}.</p>
                      {!lastRun && earliestFY && <p className="text-xs mt-1">Earliest FY for your assets: {earliestFY}. Run that year first.</p>}
                    </td></tr>
                  ) : records.map((r, i) => (
                    <tr key={r.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.asset.name}</p>
                        <p className="text-xs font-mono text-blue-700">{r.asset.assetCode}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{r.asset.category.name}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{r.asset.category.usefulLifeCompaniesAct} yrs</td>
                      <td className="px-4 py-3 text-right">{fmt(Number(r.openingWDV))}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-medium">{fmt(Number(r.companiesActDepreciation))}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmt(Number(r.companiesActClosingWDV))}</td>
                    </tr>
                  ))}
                </tbody>
                {records.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t font-semibold text-sm">
                      <td colSpan={3} className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">{fmt(caTotals.opening)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmt(caTotals.dep)}</td>
                      <td className="px-4 py-3 text-right">{fmt(caTotals.closing)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ── INCOME TAX ACT TAB — Block format matching Appendix I ─────────── */}
        <TabsContent value="it">
          {blockRows.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              {[{ label: "Opening WDV (All Blocks)", value: itTotals.opening }, { label: "Depreciation (IT Act)", value: itTotals.dep }, { label: "Closing WDV", value: itTotals.closing }].map(item => (
                <Card key={item.label}><CardContent className="p-4">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{fmt(item.value)}</p>
                </CardContent></Card>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-2.5 bg-blue-50 border-b">
              <p className="text-xs text-blue-700 font-medium">
                Appendix I, Income Tax Rules 1962 · Block of Assets · Written Down Value (WDV) Method ·
                180-day rule: assets put to use on/after 3 Oct get 50% rate (marked ½yr)
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Block of Assets</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Rate</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Opening WDV</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Additions</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Balance</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Depreciation</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Closing WDV</th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-600">Assets</th>
                  </tr>
                </thead>
                <tbody>
                  {blockRows.length === 0 ? (
                    <tr><td colSpan={8} className="py-14 text-center text-gray-400">
                      <p>No IT Act records for FY {fy}.</p>
                      {!lastRun && <p className="text-xs mt-1">Run depreciation to populate this view.</p>}
                    </td></tr>
                  ) : blockRows.map((b, i) => {
                    const balance = b.opening + b.additions - b.disposal;
                    return (
                      <tr key={b.block.id} className={`border-b last:border-0 hover:bg-blue-50 ${i % 2 === 1 ? "bg-blue-50/20" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{b.block.name}</p>
                          <p className="text-xs font-mono text-gray-400">{b.block.code}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xl font-bold text-blue-700">{(b.block.rate * 100).toFixed(0)}%</span>
                        </td>
                        <td className="px-4 py-3 text-right">{fmt(b.opening)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{b.additions > 0 ? fmt(b.additions) : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(balance)}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-semibold">{fmt(b.dep)}</td>
                        <td className="px-4 py-3 text-right font-semibold">{fmt(b.closing)}</td>
                        <td className="px-4 py-3 text-center text-xs text-gray-500">
                          {b.count}
                          {b.halfYearCount > 0 && <span className="text-blue-500 ml-1">({b.halfYearCount} ½yr)</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {blockRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50 border-t font-semibold text-sm">
                      <td className="px-4 py-3">Total</td>
                      <td />
                      <td className="px-4 py-3 text-right">{fmt(itTotals.opening)}</td>
                      <td className="px-4 py-3 text-right text-green-700">{itTotals.additions > 0 ? fmt(itTotals.additions) : "—"}</td>
                      <td className="px-4 py-3 text-right">{fmt(itTotals.opening + itTotals.additions)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmt(itTotals.dep)}</td>
                      <td className="px-4 py-3 text-right">{fmt(itTotals.closing)}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{records.length}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* All available blocks (even with 0 records) */}
          {itActBlocks.length > 0 && blockRows.length < itActBlocks.length && (
            <p className="text-xs text-gray-400 mt-3">
              {itActBlocks.length - blockRows.length} block{itActBlocks.length - blockRows.length !== 1 ? "s" : ""} have no assets in FY {fy} and are not shown.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
