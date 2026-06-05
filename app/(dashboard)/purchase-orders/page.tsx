import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ShoppingCart, Plus } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:               "bg-gray-100 text-gray-600",
  APPROVED:            "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED:  "bg-yellow-100 text-yellow-700",
  RECEIVED:            "bg-green-100 text-green-700",
  CLOSED:              "bg-red-100 text-red-600",
};

export default async function PurchaseOrdersPage() {
  const session = await auth();
  const canWrite = ["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role);

  const pos = await prisma.purchaseOrder.findMany({
    orderBy: { poDate: "desc" },
    include: {
      supplier: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { assets: true } },
    },
  });

  const totalValue = pos.reduce((s, p) => s + Number(p.totalAmount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-500" />Purchase Orders
          </h1>
          <p className="text-sm text-gray-500">{pos.length} orders · Total value: ₹{totalValue.toLocaleString("en-IN")}</p>
        </div>
        {canWrite && (
          <Link href="/purchase-orders/new">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />New PO
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              {["PO Number", "Supplier", "PO Date", "Expected Delivery", "Total Amount", "Assets", "Status", "Created By"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pos.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No purchase orders yet</td></tr>
            ) : pos.map((po, i) => (
              <tr key={po.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                <td className="px-4 py-3 font-mono font-semibold text-blue-700">
                  <Link href={`/purchase-orders/${po.id}`} className="hover:underline">{po.poNumber}</Link>
                </td>
                <td className="px-4 py-3 font-medium">{po.supplier.name}</td>
                <td className="px-4 py-3 text-gray-500">{format(new Date(po.poDate), "dd MMM yyyy")}</td>
                <td className="px-4 py-3 text-gray-500">
                  {po.expectedDelivery ? format(new Date(po.expectedDelivery), "dd MMM yyyy") : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold">₹{Number(po.totalAmount).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-center">
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">{po._count.assets}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[po.status]}`}>
                    {po.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{po.createdBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
