import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { ReportFilters } from "@/components/reports/report-filters";
import { AssetRegisterExport } from "@/components/reports/asset-register-export";

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
  searchParams: Promise<{ itActBlockId?: string; locationId?: string; supplierId?: string; userId?: string; status?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const locationBaseFilter =
    session!.user.role === "BRANCH_MANAGER" && session!.user.locationId
      ? { currentLocationId: session!.user.locationId }
      : {};

  const where = {
    ...locationBaseFilter,
    ...(sp.itActBlockId ? { itActBlockId: sp.itActBlockId } : {}),
    ...(sp.locationId ? { currentLocationId: sp.locationId } : {}),
    ...(sp.supplierId ? { supplierId: sp.supplierId } : {}),
    ...(sp.userId ? { assignedUserId: sp.userId } : {}),
    ...(sp.status ? { status: sp.status as never } : {}),
  };

  const [assets, itActBlocks, locations, suppliers, users] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [{ itActBlock: { code: "asc" } }, { assetCode: "asc" }],
      include: {
        category: true,
        itActBlock: true,
        currentLocation: true,
        currentDepartment: true,
        assignedUser: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.itActBlock.findMany({ where: { isActive: true }, orderBy: { code: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const totalCost = assets.reduce((s, a) => s + Number(a.purchaseCost), 0);

  const currentFilters = { itActBlockId: sp.itActBlockId, locationId: sp.locationId, supplierId: sp.supplierId, userId: sp.userId, status: sp.status };

  const exportRows = assets.map((a, i) => ({
    no: i + 1,
    assetCode: a.assetCode,
    name: a.name,
    makeModel: [a.make, a.model].filter(Boolean).join(" / ") || "—",
    itActBlock: a.itActBlock ? `${a.itActBlock.code} — ${a.itActBlock.name}` : "—",
    category: a.category.name,
    location: a.currentLocation.name,
    department: a.currentDepartment.name,
    assignedTo: a.assignedUser?.name ?? "—",
    status: a.status.replace(/_/g, " "),
    purchaseDate: format(new Date(a.purchaseDate), "dd MMM yyyy"),
    purchaseCost: Number(a.purchaseCost),
    residualValue: Number(a.residualValue),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-orange-500" />Asset Register
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {assets.length} assets · Gross Block: {fmt(totalCost)}
          </p>
        </div>
        <AssetRegisterExport rows={exportRows} />
      </div>

      {/* Filters */}
      <ReportFilters
        itActBlocks={itActBlocks}
        locations={locations}
        suppliers={suppliers}
        users={users}
        statuses={["ACTIVE", "IN_REPAIR", "IDLE", "IN_TRANSIT", "RETIRED", "DISPOSED"]}
        current={currentFilters}
      />

      {/* Flat table */}
      {assets.length === 0 ? (
        <div className="bg-white rounded-xl border text-center py-16 text-gray-400">No assets match the selected filters.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Asset Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase">Asset Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">IT Act Block</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Location / Dept</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Purchase Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 tracking-wide uppercase whitespace-nowrap">Residual</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => (
                  <tr key={a.id} className={`border-b last:border-0 hover:bg-orange-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                      {a.itActBlock ? (
                        <div>
                          <span className="text-xs font-mono font-semibold text-orange-600">{a.itActBlock.code}</span>
                          <div className="text-xs text-gray-500 mt-0.5 max-w-[160px] truncate">{a.itActBlock.name}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">—</span>
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
                    <td className="px-4 py-3 text-right font-mono text-sm text-gray-500 whitespace-nowrap">
                      {fmt(Number(a.residualValue))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-orange-50">
                  <td colSpan={8} className="px-4 py-3 text-xs font-semibold text-gray-600">
                    Grand Total — {assets.length} asset{assets.length !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">{fmt(totalCost)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
