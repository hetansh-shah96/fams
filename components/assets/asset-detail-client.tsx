"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, QrCode, ArrowRightLeft, Wrench, Calculator, Download } from "lucide-react";
import { format } from "date-fns";
import QRCodeDisplay from "@/components/assets/qr-code-display";

const STATUS_COLORS: Record<string, string> = {
  PROCURED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  IN_REPAIR: "bg-orange-100 text-orange-700",
  IDLE: "bg-yellow-100 text-yellow-700",
  RETIRED: "bg-gray-100 text-gray-600",
  DISPOSED: "bg-red-100 text-red-700",
  IN_TRANSIT: "bg-cyan-100 text-cyan-700",
};

interface Asset {
  id: string;
  assetCode: string;
  assetTagNumber: string | null;
  name: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  status: string;
  condition: string | null;
  purchaseDate: string;
  purchaseCost: string;
  gstPaid: string;
  residualValue: string;
  invoiceNumber: string | null;
  warrantyExpiry: string | null;
  insuranceExpiry: string | null;
  pucExpiry: string | null;
  ipConfiguration: string | null;
  description: string | null;
  createdAt: string;
  category: { name: string };
  currentLocation: { name: string };
  currentDepartment: { name: string };
  assignedUser: { name: string; email: string } | null;
  supplier: { name: string } | null;
  createdBy: { name: string };
  allocations: {
    id: string;
    transferDate: string;
    status: string;
    notes: string | null;
    toLocation: { name: string };
    fromLocation: { name: string } | null;
    toDepartment: { name: string };
    toUser: { name: string } | null;
    transferredBy: { name: string };
  }[];
  depreciation: {
    id: string;
    financialYear: string;
    openingWDV: string;
    companiesActDepreciation: string;
    companiesActClosingWDV: string;
    itActDepreciation: string;
    itActClosingWDV: string;
  }[];
  maintenance: {
    id: string;
    serviceType: string;
    serviceDate: string;
    nextDueDate: string | null;
    cost: string;
    vendorName: string | null;
    remarks: string | null;
    createdBy: { name: string };
  }[];
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

export function AssetDetailClient({ asset, canEdit }: { asset: Asset; canEdit: boolean }) {
  const [showQR, setShowQR] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/assets">
            <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            <p className="text-sm text-gray-500 font-mono">{asset.assetCode}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)}>
            <QrCode className="w-4 h-4 mr-2" />QR Code
          </Button>
          {canEdit && (
            <Link href={`/assets/${asset.id}/edit`}>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Edit className="w-4 h-4 mr-2" />Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showQR && (
        <Card className="max-w-xs">
          <CardContent className="pt-4 flex flex-col items-center gap-3">
            <QRCodeDisplay value={asset.assetCode} size={160} />
            <p className="text-xs font-mono text-gray-600">{asset.assetCode}</p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />Print Label
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Status
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[asset.status] ?? ""}`}>
                  {asset.status.replace(/_/g, " ")}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InfoRow label="Category" value={asset.category.name} />
              <InfoRow label="Condition" value={asset.condition} />
              <InfoRow label="Location" value={asset.currentLocation.name} />
              <InfoRow label="Department" value={asset.currentDepartment.name} />
              <InfoRow label="Assigned To" value={asset.assignedUser?.name} />
              <InfoRow label="Added By" value={asset.createdBy.name} />
              <InfoRow label="Added On" value={format(new Date(asset.createdAt), "dd MMM yyyy")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Financials</CardTitle></CardHeader>
            <CardContent>
              <InfoRow label="Purchase Date" value={format(new Date(asset.purchaseDate), "dd MMM yyyy")} />
              <InfoRow label="Purchase Cost" value={`₹${Number(asset.purchaseCost).toLocaleString("en-IN")}`} />
              <InfoRow label="GST Paid" value={`₹${Number(asset.gstPaid).toLocaleString("en-IN")}`} />
              <InfoRow label="Residual Value" value={`₹${Number(asset.residualValue).toLocaleString("en-IN")}`} />
              <InfoRow label="Invoice No" value={asset.invoiceNumber} />
              <InfoRow label="Supplier" value={asset.supplier?.name} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="transfers">Transfers ({asset.allocations.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance ({asset.maintenance.length})</TabsTrigger>
              <TabsTrigger value="depreciation">Depreciation ({asset.depreciation.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardContent className="pt-4">
                  <InfoRow label="Make / Brand" value={asset.make} />
                  <InfoRow label="Model" value={asset.model} />
                  <InfoRow label="Serial Number" value={asset.serialNumber} />
                  <InfoRow label="Tag Number" value={asset.assetTagNumber} />
                  <InfoRow label="IP Configuration" value={asset.ipConfiguration} />
                  <InfoRow label="Warranty Expiry" value={asset.warrantyExpiry ? format(new Date(asset.warrantyExpiry), "dd MMM yyyy") : null} />
                  <InfoRow label="Insurance Expiry" value={asset.insuranceExpiry ? format(new Date(asset.insuranceExpiry), "dd MMM yyyy") : null} />
                  <InfoRow label="PUC Expiry" value={asset.pucExpiry ? format(new Date(asset.pucExpiry), "dd MMM yyyy") : null} />
                  {asset.description && (
                    <div className="py-2">
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-sm text-gray-900">{asset.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transfers">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex justify-end mb-3">
                    {canEdit && (
                      <Link href={`/transfers/new?assetId=${asset.id}`}>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                          <ArrowRightLeft className="w-4 h-4 mr-2" />New Transfer
                        </Button>
                      </Link>
                    )}
                  </div>
                  {asset.allocations.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No transfers yet</p>
                  ) : (
                    <div className="space-y-3">
                      {asset.allocations.map((a) => (
                        <div key={a.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{a.fromLocation?.name ?? "—"} → {a.toLocation.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "COMPLETED" ? "bg-green-100 text-green-700" : a.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                              {a.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {format(new Date(a.transferDate), "dd MMM yyyy")} · {a.toDepartment.name}
                            {a.toUser && ` · ${a.toUser.name}`}
                          </p>
                          <p className="text-xs text-gray-400">By: {a.transferredBy.name}</p>
                          {a.notes && <p className="text-xs text-gray-600 mt-1 italic">{a.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex justify-end mb-3">
                    {canEdit && (
                      <Link href={`/maintenance/new?assetId=${asset.id}`}>
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                          <Wrench className="w-4 h-4 mr-2" />Add Log
                        </Button>
                      </Link>
                    )}
                  </div>
                  {asset.maintenance.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No maintenance logs</p>
                  ) : (
                    <div className="space-y-3">
                      {asset.maintenance.map((m) => (
                        <div key={m.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{m.serviceType.replace(/_/g, " ")}</p>
                            <span className="text-sm font-semibold text-gray-700">₹{Number(m.cost).toLocaleString("en-IN")}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {format(new Date(m.serviceDate), "dd MMM yyyy")}
                            {m.nextDueDate && ` · Next: ${format(new Date(m.nextDueDate), "dd MMM yyyy")}`}
                            {m.vendorName && ` · ${m.vendorName}`}
                          </p>
                          {m.remarks && <p className="text-xs text-gray-600 mt-1">{m.remarks}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="depreciation">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex justify-end mb-3">
                    <Link href={`/depreciation?assetId=${asset.id}`}>
                      <Button size="sm" variant="outline">
                        <Calculator className="w-4 h-4 mr-2" />Run Depreciation
                      </Button>
                    </Link>
                  </div>
                  {asset.depreciation.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No depreciation records</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">FY</th>
                          <th className="text-right py-2">Opening WDV</th>
                          <th className="text-right py-2">Co. Act Dep</th>
                          <th className="text-right py-2">Co. Act WDV</th>
                          <th className="text-right py-2">IT Act Dep</th>
                          <th className="text-right py-2">IT Act WDV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {asset.depreciation.map((d) => (
                          <tr key={d.id} className="border-b last:border-0">
                            <td className="py-2 font-medium">{d.financialYear}</td>
                            <td className="text-right py-2">₹{Number(d.openingWDV).toLocaleString("en-IN")}</td>
                            <td className="text-right py-2 text-red-600">₹{Number(d.companiesActDepreciation).toLocaleString("en-IN")}</td>
                            <td className="text-right py-2">₹{Number(d.companiesActClosingWDV).toLocaleString("en-IN")}</td>
                            <td className="text-right py-2 text-red-600">₹{Number(d.itActDepreciation).toLocaleString("en-IN")}</td>
                            <td className="text-right py-2">₹{Number(d.itActClosingWDV).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
