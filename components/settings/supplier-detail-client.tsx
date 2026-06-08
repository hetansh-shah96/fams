"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Building2, Package, ShoppingCart, ShieldCheck, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  APPROVED: "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-yellow-100 text-yellow-700",
  RECEIVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const ASSET_STATUS_COLORS: Record<string, string> = {
  PROCURED: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-cyan-100 text-cyan-700",
  ACTIVE: "bg-green-100 text-green-700",
  IN_REPAIR: "bg-orange-100 text-orange-700",
  IDLE: "bg-yellow-100 text-yellow-700",
  RETIRED: "bg-gray-100 text-gray-600",
  DISPOSED: "bg-red-100 text-red-700",
};

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  contactNo: string | null;
  city: string | null;
  state: string | null;
  gstNo: string | null;
  supplierType: string | null;
  isActive: boolean;
  assets: {
    id: string;
    assetCode: string;
    name: string;
    status: string;
    purchaseCost: string;
    purchaseDate: string;
    warrantyExpiry: string | null;
    category: { name: string };
  }[];
  purchaseOrders: {
    id: string;
    poNumber: string;
    poDate: string;
    totalAmount: string;
    status: string;
  }[];
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SupplierDetailClient({ supplier }: { supplier: Supplier }) {
  const totalAssetSpend = supplier.assets.reduce((sum, a) => sum + Number(a.purchaseCost), 0);
  const totalPOValue = supplier.purchaseOrders.reduce((sum, po) => sum + Number(po.totalAmount), 0);
  const openPOs = supplier.purchaseOrders.filter((po) => po.status !== "CLOSED").length;
  const withWarranty = supplier.assets.filter((a) => a.warrantyExpiry).length;
  const warrantyRate = supplier.assets.length > 0 ? Math.round((withWarranty / supplier.assets.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/suppliers">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {supplier.name}
            {!supplier.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
          </h1>
          <p className="text-sm text-gray-500 font-mono">{supplier.code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<IndianRupee className="w-5 h-5" />} label="Total Asset Spend" value={`₹${totalAssetSpend.toLocaleString("en-IN")}`} sub={`${supplier.assets.length} assets`} />
        <StatCard icon={<ShoppingCart className="w-5 h-5" />} label="Purchase Orders" value={String(supplier.purchaseOrders.length)} sub={`${openPOs} open · ₹${totalPOValue.toLocaleString("en-IN")} total`} />
        <StatCard icon={<Package className="w-5 h-5" />} label="Linked Assets" value={String(supplier.assets.length)} />
        <StatCard icon={<ShieldCheck className="w-5 h-5" />} label="Warranty Coverage" value={`${warrantyRate}%`} sub={`${withWarranty} of ${supplier.assets.length} assets`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />Supplier Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b last:border-0"><span className="text-gray-500">Contact Person</span><span className="font-medium text-gray-900">{supplier.contactPerson ?? "—"}</span></div>
            <div className="flex justify-between py-1.5 border-b last:border-0"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900">{supplier.email ?? "—"}</span></div>
            <div className="flex justify-between py-1.5 border-b last:border-0"><span className="text-gray-500">Contact No</span><span className="font-medium text-gray-900">{supplier.contactNo ?? "—"}</span></div>
            <div className="flex justify-between py-1.5 border-b last:border-0"><span className="text-gray-500">City / State</span><span className="font-medium text-gray-900">{[supplier.city, supplier.state].filter(Boolean).join(", ") || "—"}</span></div>
            <div className="flex justify-between py-1.5 border-b last:border-0"><span className="text-gray-500">GST No</span><span className="font-medium text-gray-900">{supplier.gstNo ?? "—"}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-gray-500">Type</span><span className="font-medium text-gray-900">{supplier.supplierType ?? "—"}</span></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Purchase Orders ({supplier.purchaseOrders.length})</CardTitle></CardHeader>
          <CardContent>
            {supplier.purchaseOrders.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No purchase orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold text-gray-600">PO Number</th>
                      <th className="text-left py-2 font-semibold text-gray-600">Date</th>
                      <th className="text-left py-2 font-semibold text-gray-600">Amount</th>
                      <th className="text-left py-2 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplier.purchaseOrders.map((po) => (
                      <tr key={po.id} className="border-b last:border-0 hover:bg-orange-50">
                        <td className="py-2"><Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:underline font-mono">{po.poNumber}</Link></td>
                        <td className="py-2 text-gray-600">{format(new Date(po.poDate), "dd MMM yyyy")}</td>
                        <td className="py-2 text-gray-700">₹{Number(po.totalAmount).toLocaleString("en-IN")}</td>
                        <td className="py-2"><span className={`text-xs px-2 py-1 rounded-full font-medium ${PO_STATUS_COLORS[po.status] ?? ""}`}>{po.status.replace(/_/g, " ")}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />Linked Assets ({supplier.assets.length})</CardTitle></CardHeader>
        <CardContent>
          {supplier.assets.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No assets linked to this supplier</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-semibold text-gray-600">Asset Code</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Name</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Category</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Purchase Date</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Cost (₹)</th>
                    <th className="text-left py-2 font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {supplier.assets.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-orange-50">
                      <td className="py-2"><Link href={`/assets/${a.id}`} className="text-blue-600 hover:underline font-mono">{a.assetCode}</Link></td>
                      <td className="py-2 text-gray-900">{a.name}</td>
                      <td className="py-2 text-gray-600">{a.category.name}</td>
                      <td className="py-2 text-gray-600">{format(new Date(a.purchaseDate), "dd MMM yyyy")}</td>
                      <td className="py-2 text-gray-700">₹{Number(a.purchaseCost).toLocaleString("en-IN")}</td>
                      <td className="py-2"><span className={`text-xs px-2 py-1 rounded-full font-medium ${ASSET_STATUS_COLORS[a.status] ?? ""}`}>{a.status.replace(/_/g, " ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
