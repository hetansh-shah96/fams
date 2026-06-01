"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Play } from "lucide-react";

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  purchaseCost: string;
  residualValue: string;
  category: { name: string };
}

interface Record {
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

interface Props {
  assets: Asset[];
  records: Record[];
  categories: { id: string; name: string }[];
  fyList: string[];
  selectedFY: string;
  defaultAssetId?: string;
}

export function DepreciationClient({ assets, records, categories, fyList, selectedFY, defaultAssetId }: Props) {
  const router = useRouter();
  const [fy, setFY] = useState(selectedFY);
  const [running, setRunning] = useState(false);

  async function runDepreciation() {
    setRunning(true);
    try {
      const res = await fetch("/api/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financialYear: fy }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(`Depreciation calculated for ${data.processed} assets (FY ${fy})`);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Depreciation</h1>
          <p className="text-sm text-gray-500">Companies Act (SLM) &amp; IT Act (WDV) depreciation engine</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={fy} onValueChange={(v: string | null) => { if (v) { setFY(v); router.push(`/depreciation?fy=${v}`); } }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...fyList].reverse().map((f) => (
                <SelectItem key={f} value={f}>FY {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runDepreciation} disabled={running} className="bg-orange-500 hover:bg-orange-600">
            <Play className="w-4 h-4 mr-2" />
            {running ? "Running..." : `Run FY ${fy}`}
          </Button>
        </div>
      </div>

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

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
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
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  No depreciation records for FY {fy}. Click "Run" to calculate.
                </td>
              </tr>
            ) : (
              records.map((r, i) => (
                <tr key={r.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.asset.name}</p>
                    <p className="text-xs font-mono text-blue-700">{r.asset.assetCode}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{assets.find(a => a.assetCode === r.asset.assetCode)?.category.name ?? "—"}</td>
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
  );
}
