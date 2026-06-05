"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ArrowLeft, Edit, Package, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  DRAFT:               "bg-gray-100 text-gray-600",
  APPROVED:            "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED:  "bg-yellow-100 text-yellow-700",
  RECEIVED:            "bg-green-100 text-green-700",
  CLOSED:              "bg-red-100 text-red-600",
};

const PO_STATUSES = ["DRAFT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"] as const;

interface Asset {
  id: string; assetCode: string; name: string; status: string;
  purchaseCost: string;
  category: { name: string };
  currentLocation: { name: string };
  currentDepartment: { name: string };
}

interface PO {
  id: string; poNumber: string; status: string;
  poDate: string; expectedDelivery: string | null;
  totalAmount: string; notes: string | null;
  supplier: { id: string; name: string; contactPerson: string | null; email: string | null; contactNo: string | null; gstNo: string | null };
  createdBy: { name: string };
  assets: Asset[];
}

interface Props { po: PO; suppliers: { id: string; name: string; code: string }[]; canEdit: boolean }

export function PurchaseOrderDetail({ po, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(po.status);
  const [saving, setSaving] = useState(false);

  const totalAssetCost = po.assets.reduce((s, a) => s + Number(a.purchaseCost), 0);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setSaving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${po.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Status updated");
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-orange-500" />{po.poNumber}
            </h1>
            <p className="text-sm text-gray-500">{po.supplier.name} · {format(new Date(po.poDate), "dd MMM yyyy")}</p>
          </div>
        </div>
        {canEdit && (
          <Link href={`/purchase-orders/${po.id}/edit`}>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Edit className="w-4 h-4 mr-2" />Edit
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: PO info */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Status
                {canEdit ? (
                  <Select value={status} onValueChange={(v: string | null) => { if (v) handleStatusChange(v); }}>
                    <SelectTrigger className="w-44 h-7 text-xs">
                      <SelectDisplay value={status} placeholder="">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}>
                          {status.replace(/_/g, " ")}
                        </span>
                      </SelectDisplay>
                    </SelectTrigger>
                    <SelectContent>
                      {PO_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[status]}`}>
                    {status.replace(/_/g, " ")}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {[
                ["PO Date", format(new Date(po.poDate), "dd MMM yyyy")],
                ["Expected Delivery", po.expectedDelivery ? format(new Date(po.expectedDelivery), "dd MMM yyyy") : "—"],
                ["PO Value", `₹${Number(po.totalAmount).toLocaleString("en-IN")}`],
                ["Asset Cost Total", `₹${totalAssetCost.toLocaleString("en-IN")}`],
                ["Created By", po.createdBy.name],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Supplier</CardTitle></CardHeader>
            <CardContent>
              {[
                ["Name", po.supplier.name],
                ["Contact", po.supplier.contactPerson],
                ["Email", po.supplier.email],
                ["Phone", po.supplier.contactNo],
                ["GST No", po.supplier.gstNo],
              ].map(([label, value]) => value ? (
                <div key={label} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-900">{value}</span>
                </div>
              ) : null)}
            </CardContent>
          </Card>

          {po.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-700">{po.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Right: assets linked to this PO */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Package className="w-4 h-4" />Assets ({po.assets.length})</span>
                <Link href={`/assets/new?purchaseOrderId=${po.id}`}>
                  <Button size="sm" variant="outline" className="text-xs">Add Asset to PO</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {po.assets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">No assets linked yet.<br />
                  <span className="text-xs">Create an asset and select this PO in the financial tab.</span>
                </p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {["Asset Code", "Name", "Category", "Location", "Cost", "Status"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {po.assets.map((a, i) => (
                      <tr key={a.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                        <td className="px-3 py-2 font-mono text-blue-700">
                          <Link href={`/assets/${a.id}`} className="hover:underline">{a.assetCode}</Link>
                        </td>
                        <td className="px-3 py-2 font-medium">{a.name}</td>
                        <td className="px-3 py-2 text-gray-500">{a.category.name}</td>
                        <td className="px-3 py-2 text-gray-500">{a.currentLocation.name}</td>
                        <td className="px-3 py-2 text-right">₹{Number(a.purchaseCost).toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{a.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t">
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-gray-600">Total Asset Cost</td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-gray-900">₹{totalAssetCost.toLocaleString("en-IN")}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
