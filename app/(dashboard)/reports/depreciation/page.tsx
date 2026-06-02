import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getCurrentIndianFY, getIndianFYList } from "@/lib/depreciation";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { FYSelect } from "@/components/reports/fy-select";
import { ReportFilters } from "@/components/reports/report-filters";

export default async function DepreciationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; categoryId?: string; locationId?: string }>;
}) {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const fy = sp.fy ?? getCurrentIndianFY();

  const [categories, locations] = await Promise.all([
    prisma.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const depWhere = {
    financialYear: fy,
    ...(sp.categoryId ? { asset: { categoryId: sp.categoryId } } : {}),
    ...(sp.locationId ? { asset: { currentLocationId: sp.locationId } } : {}),
  };

  const rawRecords = await prisma.depreciationRecord.findMany({
    where: depWhere,
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

  // Sort by category name in JS (Prisma 7 doesn't support nested relation orderBy)
  const records = [...rawRecords].sort((a, b) =>
    a.asset.category.name.localeCompare(b.asset.category.name)
  );

  const fyList = getIndianFYList().reverse();

  // Group by category
  const byCategory = records.reduce<Record<string, typeof records>>((acc, r) => {
    (acc[r.asset.category.name] ??= []).push(r);
    return acc;
  }, {});
  const sortedCategories = Object.keys(byCategory).sort();

  const grandTotals = records.reduce(
    (acc, r) => ({
      openingWDV: acc.openingWDV + Number(r.openingWDV),
      companiesActDep: acc.companiesActDep + Number(r.companiesActDepreciation),
      companiesActWDV: acc.companiesActWDV + Number(r.companiesActClosingWDV),
      itActDep: acc.itActDep + Number(r.itActDepreciation),
      itActWDV: acc.itActWDV + Number(r.itActClosingWDV),
    }),
    { openingWDV: 0, companiesActDep: 0, companiesActWDV: 0, itActDep: 0, itActWDV: 0 }
  );

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

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

      {/* Filters */}
      <ReportFilters
        categories={categories}
        locations={locations}
        current={{ categoryId: sp.categoryId, locationId: sp.locationId }}
      />

      {records.length === 0 && (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">
          No depreciation records for FY {fy}
        </div>
      )}

      {sortedCategories.map(catName => {
        const catRecords = byCategory[catName];
        const firstRecord = catRecords[0];
        const cat = firstRecord.asset.category;
        const catTotals = catRecords.reduce(
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
          <div key={catName} className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-orange-50 border-b px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-800">{catName}</span>
              </div>
              <span className="text-xs text-gray-500">
                {catRecords.length} assets
              </span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Asset</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Location</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600">Opening WDV</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600">Co. Act Dep</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600">Co. Act WDV</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600">IT Act Dep</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600">IT Act WDV</th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-600">½yr</th>
                </tr>
              </thead>
              <tbody>
                {catRecords.map((r, i) => (
                  <tr key={r.id} className={`border-b last:border-0 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{r.asset.name}</p>
                      <p className="font-mono text-blue-700">{r.asset.assetCode}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{r.asset.currentLocation.name}</td>
                    <td className="px-3 py-2 text-right">{fmt(Number(r.openingWDV))}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmt(Number(r.companiesActDepreciation))}</td>
                    <td className="px-3 py-2 text-right">{fmt(Number(r.companiesActClosingWDV))}</td>
                    <td className="px-3 py-2 text-right text-red-600">{fmt(Number(r.itActDepreciation))}</td>
                    <td className="px-3 py-2 text-right">{fmt(Number(r.itActClosingWDV))}</td>
                    <td className="px-3 py-2 text-center">{r.halfYearRule ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t font-semibold text-xs">
                  <td colSpan={2} className="px-3 py-2 text-gray-500">{catName} subtotal</td>
                  <td className="px-3 py-2 text-right">{fmt(catTotals.openingWDV)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmt(catTotals.companiesActDep)}</td>
                  <td className="px-3 py-2 text-right">{fmt(catTotals.companiesActWDV)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{fmt(catTotals.itActDep)}</td>
                  <td className="px-3 py-2 text-right">{fmt(catTotals.itActWDV)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}

      {records.length > 0 && (
        <div className="bg-white rounded-xl border px-4 py-3 text-xs font-semibold flex gap-6 justify-end">
          <span className="text-gray-500 mr-auto">Grand Total ({records.length} assets)</span>
          <span>{fmt(grandTotals.openingWDV)}</span>
          <span className="text-red-600">{fmt(grandTotals.companiesActDep)}</span>
          <span>{fmt(grandTotals.companiesActWDV)}</span>
          <span className="text-red-600">{fmt(grandTotals.itActDep)}</span>
          <span>{fmt(grandTotals.itActWDV)}</span>
          <span className="w-8" />
        </div>
      )}
    </div>
  );
}
