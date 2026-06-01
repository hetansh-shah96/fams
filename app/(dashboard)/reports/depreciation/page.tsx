import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentIndianFY, getIndianFYList } from "@/lib/depreciation";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { FYSelect } from "@/components/reports/fy-select";

export default async function DepreciationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const fy = sp.fy ?? getCurrentIndianFY();

  const records = await prisma.depreciationRecord.findMany({
    where: { financialYear: fy },
    orderBy: { calculatedAt: "desc" },
    include: {
      asset: {
        select: {
          assetCode: true,
          name: true,
          purchaseDate: true,
          purchaseCost: true,
          category: { select: { name: true } },
          currentLocation: { select: { name: true } },
        },
      },
    },
  });

  const fyList = getIndianFYList().reverse();
  const totals = records.reduce((acc, r) => ({
    openingWDV: acc.openingWDV + Number(r.openingWDV),
    companiesActDep: acc.companiesActDep + Number(r.companiesActDepreciation),
    companiesActWDV: acc.companiesActWDV + Number(r.companiesActClosingWDV),
    itActDep: acc.itActDep + Number(r.itActDepreciation),
    itActWDV: acc.itActWDV + Number(r.itActClosingWDV),
  }), { openingWDV: 0, companiesActDep: 0, companiesActWDV: 0, itActDep: 0, itActWDV: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-orange-500" />Depreciation Schedule
          </h1>
          <p className="text-sm text-gray-500">FY {fy} · {records.length} assets</p>
        </div>
        <div className="flex items-center gap-2">
          <FYSelect fyList={fyList} selected={fy} basePath="/reports/depreciation" />
          <Link href="/depreciation" className="text-sm text-orange-600 hover:underline">Run Depreciation →</Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-3 py-3 font-semibold text-gray-600">Asset</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600">Category</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600">Location</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">Opening WDV</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">Co. Act Dep</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">Co. Act WDV</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">IT Act Dep</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600">IT Act WDV</th>
              <th className="text-center px-3 py-3 font-semibold text-gray-600">½yr</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No depreciation records for FY {fy}</td></tr>
            ) : (
              records.map((r, i) => (
                <tr key={r.id} className={`border-b last:border-0 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium">{r.asset.name}</p>
                    <p className="font-mono text-blue-700">{r.asset.assetCode}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.asset.category.name}</td>
                  <td className="px-3 py-2 text-gray-600">{r.asset.currentLocation.name}</td>
                  <td className="px-3 py-2 text-right">₹{Number(r.openingWDV).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-right text-red-600">₹{Number(r.companiesActDepreciation).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-right">₹{Number(r.companiesActClosingWDV).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-right text-red-600">₹{Number(r.itActDepreciation).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-right">₹{Number(r.itActClosingWDV).toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 text-center">{r.halfYearRule ? "✓" : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t font-semibold text-xs">
                <td colSpan={3} className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">₹{totals.openingWDV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-2 text-right text-red-600">₹{totals.companiesActDep.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-2 text-right">₹{totals.companiesActWDV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-2 text-right text-red-600">₹{totals.itActDep.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td className="px-3 py-2 text-right">₹{totals.itActWDV.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
