"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Play, CheckCircle2, Info, X } from "lucide-react";

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  purchaseCost: string;
  residualValue: string;
  purchaseDate: string;
  category: { name: string };
}

interface DepreciationRecord {
  id: string;
  financialYear: string;
  openingWDV: string;
  companiesActDepreciation: string;
  companiesActClosingWDV: string;
  itActDepreciation: string;
  itActClosingWDV: string;
  halfYearRule: boolean;
  asset: { assetCode: string; name: string };
}

interface RunResult {
  fy: string;
  processed: number;
  priorYearsAutoFilled: number;
  notApplicable: number;
}

interface Props {
  assets: Asset[];
  records: DepreciationRecord[];
  categories: { id: string; name: string }[];
  fyList: string[];
  selectedFY: string;
  defaultAssetId?: string;
}

export function DepreciationClient({ assets, records, categories, fyList, selectedFY }: Props) {
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

      setLastRun({
        fy,
        processed: data.processed,
        priorYearsAutoFilled: data.priorYearsAutoFilled ?? 0,
        notApplicable: data.notApplicable ?? 0,
      });

      if (data.processed > 0) {
        toast.success(`FY ${fy}: calculated for ${data.processed} asset${data.processed !== 1 ? "s" : ""}`);
      } else if (data.notApplicable > 0 && data.processed === 0) {
        toast.info(`No assets were active in FY ${fy}`);
      }

      router.refresh();
    } catch {
      toast.error("Failed to run depreciation");
    } finally {
      setRunning(false);
    }
  }

  const totals = records.reduce(
    (acc, r) => ({
      openingWDV: acc.openingWDV + Number(r.openingWDV),
      companiesActDep: acc.companiesActDep + Number(r.companiesActDepreciation),
      companiesActWDV: acc.companiesActWDV + Number(r.companiesActClosingWDV),
      itActDep: acc.itActDep + Number(r.itActDepreciation),
      itActWDV: acc.itActWDV + Number(r.itActClosingWDV),
    }),
    { openingWDV: 0, companiesActDep: 0, companiesActWDV: 0, itActDep: 0, itActWDV: 0 }
  );

  // Figure out the earliest FY any active asset can be depreciated in
  const earliestFY = assets.reduce<string | null>((min, a) => {
    const d = new Date(a.purchaseDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const firstFY = month >= 3 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;
    if (!min) return firstFY;
    return firstFY < min ? firstFY : min;
  }, null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Depreciation</h1>
          <p className="text-sm text-gray-500">
            Companies Act 2013 (SLM) &amp; IT Act (WDV) — select target FY and run once
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={fy} onValueChange={(v: string | null) => { if (v) { setFY(v); setLastRun(null); router.push(`/depreciation?fy=${v}`); } }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...fyList].reverse().map((f) => (
                <SelectItem key={f} value={f}>FY {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runDepreciation} disabled={running} className="bg-orange-500 hover:bg-orange-600 whitespace-nowrap">
            <Play className="w-4 h-4 mr-2" />
            {running ? "Running..." : `Run FY ${fy}`}
          </Button>
        </div>
      </div>

      {/* Run result panel */}
      {lastRun && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Run result — FY {lastRun.fy}</p>
            <button onClick={() => setLastRun(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {lastRun.processed > 0 && (
              <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>{lastRun.processed} asset{lastRun.processed !== 1 ? "s" : ""}</strong> calculated for FY {lastRun.fy}.
                  {lastRun.priorYearsAutoFilled > 0 && (
                    <span className="text-green-600"> ({lastRun.priorYearsAutoFilled} missing prior-year record{lastRun.priorYearsAutoFilled !== 1 ? "s" : ""} auto-filled to get here.)</span>
                  )}
                </span>
              </div>
            )}

            {lastRun.processed === 0 && lastRun.notApplicable > 0 && (
              <div className="flex items-start gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  All {lastRun.notApplicable} asset{lastRun.notApplicable !== 1 ? "s" : ""} were purchased after FY {lastRun.fy} — nothing to calculate for this year.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary KPI cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Opening WDV", value: totals.openingWDV },
            { label: "Co. Act Dep", value: totals.companiesActDep },
            { label: "Co. Act WDV", value: totals.companiesActWDV },
            { label: "IT Act Dep", value: totals.itActDep },
            { label: "IT Act WDV", value: totals.itActWDV },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  ₹{item.value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Records table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Opening WDV</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Co. Act Dep</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Co. Act WDV</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">IT Act Dep</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">IT Act WDV</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">½yr</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-14 text-center">
                  <p className="text-gray-400 mb-1">No depreciation records for FY {fy}.</p>
                  {!lastRun && (
                    <p className="text-xs text-gray-400">
                      {earliestFY
                        ? `Earliest eligible FY for your assets is ${earliestFY}. Run years in order from there.`
                        : `Click "Run FY ${fy}" to calculate.`}
                    </p>
                  )}
                </td>
              </tr>
            ) : (
              records.map((r, i) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.asset.name}</p>
                    <p className="text-xs font-mono text-blue-700">{r.asset.assetCode}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {assets.find(a => a.assetCode === r.asset.assetCode)?.category.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">₹{Number(r.openingWDV).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-red-600">₹{Number(r.companiesActDepreciation).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">₹{Number(r.companiesActClosingWDV).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right text-red-600">₹{Number(r.itActDepreciation).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">₹{Number(r.itActClosingWDV).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-center">{r.halfYearRule ? "✓" : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t font-semibold">
                <td colSpan={2} className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">₹{totals.openingWDV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-4 py-3 text-right text-red-600">₹{totals.companiesActDep.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-4 py-3 text-right">₹{totals.companiesActWDV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-4 py-3 text-right text-red-600">₹{totals.itActDep.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-4 py-3 text-right">₹{totals.itActWDV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>
    </div>
  );
}
