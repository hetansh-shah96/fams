import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { PrintButton } from "@/components/reports/print-button";
import { ReportFilters } from "@/components/reports/report-filters";

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

  // Group by category — if categoryId filter active, only one group
  const byCategory = assets.reduce<Record<string, typeof assets>>((acc, a) => {
    (acc[a.category.name] ??= []).push(a);
    return acc;
  }, {});
  const sortedCategories = Object.keys(byCategory).sort();

  const currentFilters = {
    categoryId: sp.categoryId,
    locationId: sp.locationId,
    supplierId: sp.supplierId,
    userId: sp.userId,
    status: sp.status,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-orange-500" />Asset Register
          </h1>
          <p className="text-sm text-gray-500">
            {assets.length} assets · ₹{totalCost.toLocaleString("en-IN")} gross block
            {sp.categoryId && ` · Category: ${categories.find(c => c.id === sp.categoryId)?.name}`}
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

      {/* Category-grouped tables */}
      {sortedCategories.map(catName => {
        const catAssets = byCategory[catName];
        const catTotal = catAssets.reduce((s, a) => s + Number(a.purchaseCost), 0);
        const cat = catAssets[0].category;

        return (
          <div key={catName} className="bg-white rounded-xl border overflow-hidden print:shadow-none">
            <div className="bg-orange-50 border-b px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-800">{catName}</span>
                {cat.group && <span className="text-xs text-gray-500">· {cat.group}</span>}
                {cat.isIntangible && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700">Intangible</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-500">{catAssets.length} assets</span>
                <span className="font-semibold text-gray-700">₹{catTotal.toLocaleString("en-IN")}</span>
                {/* Link to view this category alone */}
                {!sp.categoryId && (
                  <Link href={`/reports/asset-register?categoryId=${cat.id}`} className="text-orange-500 hover:underline">
                    View only →
                  </Link>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {["Asset Code", "Name", "Make/Model", "Serial No", "Location", "Dept", "Assigned To", "Supplier", "Status", "Purchase Date", "Cost (₹)", "Residual (₹)"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catAssets.map((a, i) => (
                    <tr key={a.id} className={`border-b last:border-0 hover:bg-orange-50/50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                      <td className="px-3 py-2 font-mono text-blue-700 whitespace-nowrap">
                        <Link href={`/assets/${a.id}`} className="hover:underline">{a.assetCode}</Link>
                      </td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{a.name}</td>
                      <td className="px-3 py-2 text-gray-600">{[a.make, a.model].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{a.serialNumber ?? "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{a.currentLocation.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{a.currentDepartment.name}</td>
                      <td className="px-3 py-2 text-gray-600">{a.assignedUser?.name ?? <span className="text-gray-400 italic">Office</span>}</td>
                      <td className="px-3 py-2 text-gray-600">{a.supplier?.name ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${a.status === "ACTIVE" ? "bg-green-100 text-green-700" : a.status === "IN_REPAIR" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                          {a.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{format(new Date(a.purchaseDate), "dd-MMM-yy")}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">₹{Number(a.purchaseCost).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">₹{Number(a.residualValue).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t font-semibold text-xs">
                    <td colSpan={10} className="px-3 py-2 text-gray-500">{catName} subtotal ({catAssets.length})</td>
                    <td className="px-3 py-2 text-right">₹{catTotal.toLocaleString("en-IN")}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      {assets.length === 0 && (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">No assets match the selected filters.</div>
      )}

      {/* Grand total */}
      {assets.length > 0 && (
        <div className="bg-white rounded-xl border px-4 py-3 flex justify-between items-center font-semibold text-sm">
          <span>Grand Total · {assets.length} assets · {sortedCategories.length} categories</span>
          <span>₹{totalCost.toLocaleString("en-IN")}</span>
        </div>
      )}
    </div>
  );
}
