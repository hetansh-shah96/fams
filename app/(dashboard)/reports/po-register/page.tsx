import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format } from "date-fns";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  APPROVED: "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-700",
  RECEIVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

export default async function PoRegisterReportPage() {
  const session = await auth();
  const locationFilter = session!.user.role === "BRANCH_MANAGER" && session!.user.locationId
    ? { currentLocationId: session!.user.locationId } : {};

  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: { poDate: "desc" },
    include: {
      supplier: { select: { name: true, code: true } },
      assets: {
        where: locationFilter,
        select: {
          id: true,
          assetCode: true,
          name: true,
          purchaseCost: true,
          status: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const visiblePOs = purchaseOrders.filter((po) => po.assets.length > 0 || Object.keys(locationFilter).length === 0);

  const totalPOValue = visiblePOs.reduce((s, po) => s + Number(po.totalAmount), 0);
  const totalAssetCost = visiblePOs.reduce((s, po) => s + po.assets.reduce((a, x) => a + Number(x.purchaseCost), 0), 0);
  const totalVariance = totalAssetCost - totalPOValue;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-orange-500" />PO-wise Asset Register
        </h1>
        <p className="text-sm text-gray-500">
          {visiblePOs.length} purchase orders · PO Value: ₹{totalPOValue.toLocaleString("en-IN")} · Asset Cost: ₹{totalAssetCost.toLocaleString("en-IN")} ·{" "}
          <span className={totalVariance === 0 ? "text-gray-500 font-medium" : totalVariance > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
            Variance: {totalVariance >= 0 ? "+" : ""}₹{totalVariance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </span>
        </p>
      </div>

      <div className="space-y-4">
        {visiblePOs.length === 0 ? (
          <div className="bg-white rounded-xl border py-12 text-center text-gray-400">No purchase orders found</div>
        ) : (
          visiblePOs.map((po) => {
            const assetCost = po.assets.reduce((s, a) => s + Number(a.purchaseCost), 0);
            const variance = assetCost - Number(po.totalAmount);
            return (
              <div key={po.id} className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Link href={`/purchase-orders/${po.id}`} className="font-mono text-blue-700 hover:underline font-medium">
                      {po.poNumber}
                    </Link>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${PO_STATUS_COLORS[po.status] ?? ""}`}>
                      {po.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-gray-500">{po.supplier.name} ({po.supplier.code})</span>
                    <span className="text-sm text-gray-400">{format(new Date(po.poDate), "dd MMM yyyy")}</span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-4">
                    <span>PO Value: <span className="font-semibold text-gray-900">₹{Number(po.totalAmount).toLocaleString("en-IN")}</span></span>
                    <span>Asset Cost: <span className="font-semibold text-gray-900">₹{assetCost.toLocaleString("en-IN")}</span></span>
                    <span className={variance === 0 ? "text-gray-500" : variance > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                      Variance: {variance >= 0 ? "+" : ""}₹{variance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                {po.assets.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">No assets linked to this PO</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        {["Asset Code", "Name", "Category", "Status", "Cost"].map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {po.assets.map((a, i) => (
                        <tr key={a.id} className={`border-b last:border-0 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                          <td className="px-3 py-2 font-mono text-blue-700">
                            <Link href={`/assets/${a.id}`} className="hover:underline">{a.assetCode}</Link>
                          </td>
                          <td className="px-3 py-2 font-medium">{a.name}</td>
                          <td className="px-3 py-2 text-gray-600">{a.category.name}</td>
                          <td className="px-3 py-2 text-gray-600">{a.status.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2 text-right">₹{Number(a.purchaseCost).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
