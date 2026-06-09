import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { PrintButton } from "@/components/reports/print-button";
import { ReportFilters } from "@/components/reports/report-filters";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:     "bg-green-50 text-green-700",
  IN_REPAIR:  "bg-orange-50 text-orange-700",
  IDLE:       "bg-yellow-50 text-yellow-700",
  PROCURED:   "bg-blue-50 text-blue-700",
  IN_TRANSIT: "bg-cyan-50 text-cyan-700",
  RETIRED:    "bg-gray-100 text-gray-500",
  DISPOSED:   "bg-red-50 text-red-600",
};

function fmt(n: number) {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function AssetRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ categoryId?: string; locationId?: string; supplierId?: string; userId?: string; status?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const locationBaseFilter =
    session!.user.role === "BRANCH_MANAGER" && session!.user.locationId
      ? { currentLocationId: session!.user.locationId }
      : {};

  const where = {
    ...locationBaseFilter,
    ...(sp.categoryId ? { categoryId: sp.categoryId } : {}),
    ...(sp.locationId ? { currentLocationId: sp.locationId } : {}),
    ...(sp.supplierId ? { supplierId: sp.supplierId } : {}),
    ...(sp.userId ? { assignedUserId: sp.userId } : {}),
    ...(sp.status ? { status: sp.status as never } : {}),
  };

  const [assets, categories, locations, suppliers, users] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [{ category: { name: "asc" } }, { assetCode: "asc" }],
      include: {
        category: true,
        currentLocation: true,
        currentDepartment: true,
        assignedUser: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const totalCost = assets.reduce((s, a) => s + Number(a.purchaseCost), 0);

  const byCategory = assets.reduce<Record<string, typeof assets>>((acc, a) => {
    (acc[a.category.name] ??= []).push(a);
    return acc;
  }, {});
  const sortedCategories = Object.keys(byCategory).sort();

  const currentFilters = { categoryId: sp.categoryId, locationId: sp.locationId, supplierId: sp.supplierId, userId: sp.userId, status: sp.status };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-orange-500" />Asset Register
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {assets.length} assets · {sortedCategories.length} categories · Gross Block: {fmt(totalCost)}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Filters */}
      <ReportFilters
        categories={categories}
        locations={locations}
        suppliers={suppliers}
        users={users}
        statuses={["ACTIVE", "IN_REPAIR", "IDLE", "PROCURED", "IN_TRANSIT", "RETIRED", "DISPOSED"]}
        current={currentFilters}
      />

      {/* Category groups */}
      {assets.length === 0 ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">No assets match the selected filters.</div>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map(catName => {
            const catAssets = byCategory[catName];
            const catTotal = catAssets.reduce((s, a) => s + Number(a.purchaseCost), 0);
            const cat = catAssets[0].category;

            return (
              <div key={catName} className="bg-white rounded-xl border overflow-hidden shadow-sm print:shadow-none">
                {/* Category header */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-sm text-gray-800">{catName}</span>
                    {cat.group && <span className="text-xs text-gray-400 font-normal">— {cat.group}</span>}
                    {cat.isIntangible && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-700 font-medium border border-yellow-100">Intangible</span>
                    )}
                  </div>
                  <div className="flex items-center gap-5 text-xs">
                    <span className="text-gray-500">{catAssets.length} asset{catAssets.length !== 1 ? "s" : ""}</span>
                    <span className="font-semibold text-gray-900">{fmt(catTotal)}</span>
                    {!sp.categoryId && (
                      <Link href={`/reports/asset-register?categoryId=${cat.id}`} className="text-orange-500 hover:text-orange-600 font-medium">
                        Filter →
                      </Link>
                    )}
                  </div>
                </div>

                {/* Asset rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Asset Code</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase">Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Location · Dept</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Assigned To</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase">Status</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Purchase Date</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Cost</th>
                        <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Residual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {catAssets.map((a, i) => (
                        <tr
                          key={a.id}
                          className={`border-b last:border-0 transition-colors hover:bg-orange-50/40 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}
                        >
                          <td className="px-5 py-3 whitespace-nowrap">
                            <Link href={`/assets/${a.id}`} className="font-mono text-xs text-blue-600 font-semibold hover:underline">
                              {a.assetCode}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 leading-snug">{a.name}</div>
                            {(a.make || a.model) && (
                              <div className="text-xs text-gray-400 mt-0.5">{[a.make, a.model].filter(Boolean).join(" · ")}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-gray-700 text-sm">{a.currentLocation.name}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{a.currentDepartment.name}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {a.assignedUser?.name ?? <span className="text-gray-400 text-xs italic">Office</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                              {a.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {format(new Date(a.purchaseDate), "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {fmt(Number(a.purchaseCost))}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-sm text-gray-500 whitespace-nowrap">
                            {fmt(Number(a.residualValue))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-gray-50/80">
                        <td colSpan={6} className="px-5 py-2.5 text-xs text-gray-400 font-medium">
                          Subtotal — {catAssets.length} asset{catAssets.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-sm font-bold text-gray-900">{fmt(catTotal)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          <div className="bg-white rounded-xl border px-5 py-3.5 flex justify-between items-center shadow-sm">
            <div className="text-sm text-gray-600">
              Grand Total · <span className="font-semibold text-gray-900">{assets.length} assets</span> across <span className="font-semibold text-gray-900">{sortedCategories.length} categories</span>
            </div>
            <div className="font-mono font-bold text-lg text-gray-900">{fmt(totalCost)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
