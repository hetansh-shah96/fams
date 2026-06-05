"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, QrCode, ArrowRightLeft, Wrench, Calculator, Download, ClipboardCheck, Package, Clock, Trash2 } from "lucide-react";
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
  category: { name: string; group: string | null; usefulLifeCompaniesAct: number; depreciationMethod: string; customFields: { key: string; label: string }[] | null };
  itActBlock: { name: string; rate: number } | null;
  currentLocation: { name: string };
  customValues: Record<string, string> | null;
  currentDepartment: { name: string };
  assignedUser: { name: string; email: string } | null;
  supplier: { name: string } | null;
  purchaseOrder: { id: string; poNumber: string } | null;
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
    halfYearRule: boolean;
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
  auditEntries: {
    id: string;
    status: string;
    scannedAt: string | null;
    notes: string | null;
    auditSession: { name: string };
    foundLocation: { name: string } | null;
    scannedBy: { name: string };
  }[];
  disposal: {
    method: string;
    disposalDate: string;
    saleValue: string;
    buyerName: string | null;
    remarks: string | null;
    approvedBy: { name: string };
  } | null;
  maintenanceSchedules: {
    id: string;
    serviceType: string;
    frequencyDays: number;
    nextDueDate: string;
    lastServiceDate: string | null;
    notes: string | null;
    isActive: boolean;
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
  const router = useRouter();
  const [showQR, setShowQR] = useState(false);
  const [showDispose, setShowDispose] = useState(false);

  const isDisposed = asset.status === "DISPOSED";

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
          {canEdit && !isDisposed && (
            <>
              <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowDispose(true)}>
                <Trash2 className="w-4 h-4 mr-2" />Dispose
              </Button>
              <Link href={`/assets/${asset.id}/edit`}>
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                  <Edit className="w-4 h-4 mr-2" />Edit
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {showDispose && (
        <DisposeModal
          asset={asset}
          onClose={() => setShowDispose(false)}
          onSuccess={() => { setShowDispose(false); router.refresh(); }}
        />
      )}

      {showQR && (
        <Card className="max-w-xs">
          <CardContent className="pt-4 flex flex-col items-center gap-3">
            <QRCodeDisplay assetId={asset.id} assetCode={asset.assetCode} size={160} />
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
              <InfoRow label="Purchase Order" value={
                asset.purchaseOrder
                  ? <Link href={`/purchase-orders/${asset.purchaseOrder.id}`} className="text-blue-600 hover:underline font-mono">{asset.purchaseOrder.poNumber}</Link>
                  : null
              } />
            </CardContent>
          </Card>

          {asset.disposal && (
            <Card className="border-red-200 bg-red-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />Disposal Record
                </CardTitle>
              </CardHeader>
              <CardContent>
                <InfoRow label="Method" value={asset.disposal.method.replace(/_/g, " ")} />
                <InfoRow label="Date" value={format(new Date(asset.disposal.disposalDate), "dd MMM yyyy")} />
                <InfoRow label="Sale Value" value={`₹${Number(asset.disposal.saleValue).toLocaleString("en-IN")}`} />
                {asset.disposal.buyerName && <InfoRow label="Buyer" value={asset.disposal.buyerName} />}
                {asset.disposal.remarks && <InfoRow label="Remarks" value={asset.disposal.remarks} />}
                <InfoRow label="Approved By" value={asset.disposal.approvedBy.name} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="transfers">Transfers ({asset.allocations.length})</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance ({asset.maintenance.length})</TabsTrigger>
              <TabsTrigger value="depreciation">Depreciation ({asset.depreciation.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardContent className="pt-4">
                  <InfoRow label="Make / Brand" value={asset.make} />
                  <InfoRow label="Model" value={asset.model} />
                  <InfoRow label="Serial Number" value={asset.serialNumber} />
                  <InfoRow label="Tag Number" value={asset.assetTagNumber} />
                  <InfoRow label="IP Configuration" value={asset.ipConfiguration} />
                  {/* Category-specific custom field values */}
                  {asset.category.customFields?.map(f => (
                    <InfoRow key={f.key} label={f.label} value={asset.customValues?.[f.key] || null} />
                  ))}
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
              <div className="space-y-4">
                <MaintenanceSchedulesSection asset={asset} canEdit={canEdit} />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Service Logs
                      {canEdit && (
                        <Link href={`/maintenance/new?assetId=${asset.id}`}>
                          <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                            <Wrench className="w-4 h-4 mr-2" />Add Log
                          </Button>
                        </Link>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
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
              </div>
            </TabsContent>

            <TabsContent value="depreciation">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="bg-orange-50 border border-orange-100 rounded px-2.5 py-1 text-orange-700 font-medium">
                      CA: {asset.category.usefulLifeCompaniesAct} yrs {asset.category.depreciationMethod} · {(100 / asset.category.usefulLifeCompaniesAct).toFixed(2)}% p.a.
                    </span>
                    {asset.itActBlock && (
                      <span className="bg-blue-50 border border-blue-100 rounded px-2.5 py-1 text-blue-700 font-medium">
                        IT Act: {(asset.itActBlock.rate * 100).toFixed(0)}% WDV · ½yr {(asset.itActBlock.rate * 50).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <Link href={`/depreciation?assetId=${asset.id}`}>
                    <Button size="sm" variant="outline">
                      <Calculator className="w-4 h-4 mr-2" />Run Depreciation
                    </Button>
                  </Link>
                </div>

                <Tabs defaultValue="ca">
                  <TabsList variant="line">
                    <TabsTrigger value="ca" className="text-xs px-3 py-1.5">
                      Companies Act (SLM)
                    </TabsTrigger>
                    {asset.itActBlock && (
                      <TabsTrigger value="it" className="text-xs px-3 py-1.5">
                        Income Tax Act (WDV)
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="ca">
                    {asset.depreciation.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No records — click Run Depreciation</p>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg mt-2">
                        <table className="w-full text-xs min-w-[440px]">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="text-left px-4 py-2.5 font-semibold text-gray-500">FY</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Opening WDV</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Depreciation</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Closing WDV</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asset.depreciation.map((d, i) => (
                              <tr key={d.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                                <td className="px-4 py-2.5 font-semibold text-gray-700">{d.financialYear}</td>
                                <td className="px-4 py-2.5 text-right">₹{Number(d.openingWDV).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2.5 text-right text-red-600 font-medium">₹{Number(d.companiesActDepreciation).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2.5 text-right font-medium">₹{Number(d.companiesActClosingWDV).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </TabsContent>

                  {asset.itActBlock && (
                    <TabsContent value="it">
                      <div className="overflow-x-auto border rounded-lg mt-2">
                        <table className="w-full text-xs min-w-[480px]">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="text-left px-4 py-2.5 font-semibold text-gray-500">FY</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Opening WDV</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Depreciation</th>
                              <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Closing WDV</th>
                              <th className="text-center px-4 py-2.5 font-semibold text-gray-500">½yr</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asset.depreciation.map((d, i) => (
                              <tr key={d.id} className={`border-b last:border-0 hover:bg-blue-50 ${i % 2 === 1 ? "bg-blue-50/20" : ""}`}>
                                <td className="px-4 py-2.5 font-semibold text-gray-700">{d.financialYear}</td>
                                <td className="px-4 py-2.5 text-right">₹{Number(d.openingWDV).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2.5 text-right text-red-600 font-medium">₹{Number(d.itActDepreciation).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2.5 text-right font-medium">₹{Number(d.itActClosingWDV).toLocaleString("en-IN")}</td>
                                <td className="px-4 py-2.5 text-center text-gray-400">{d.halfYearRule ? "✓" : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </TabsContent>
            <TabsContent value="timeline">
              <AssetTimeline asset={asset} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

type TimelineEvent = {
  id: string;
  date: Date;
  type: "created" | "transfer" | "maintenance" | "audit";
  title: string;
  subtitle?: string;
  detail?: string;
  badge?: string;
  badgeColor?: string;
};

const FREQ_OPTIONS = [
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Half-yearly", days: 180 },
  { label: "Yearly", days: 365 },
  { label: "2 Years", days: 730 },
];

const SERVICE_TYPES = [
  "AMC_VISIT", "BREAKDOWN_REPAIR", "SCHEDULED_SERVICE",
  "INSURANCE_RENEWAL", "PUC_RENEWAL", "WARRANTY_CLAIM", "OTHER",
];

function MaintenanceSchedulesSection({ asset, canEdit }: { asset: Asset; canEdit: boolean }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [serviceType, setServiceType] = useState("AMC_VISIT");
  const [frequencyDays, setFrequencyDays] = useState(365);
  const [nextDueDate, setNextDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/assets/${asset.id}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceType, frequencyDays, nextDueDate, notes }),
    });
    setSaving(false);
    setShowForm(false);
    setNotes("");
    router.refresh();
  }

  async function handleToggle(sid: string, isActive: boolean) {
    setToggling(sid);
    await fetch(`/api/assets/${asset.id}/schedules/${sid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setToggling(null);
    router.refresh();
  }

  async function handleDelete(sid: string) {
    if (!confirm("Delete this schedule?")) return;
    setDeleting(sid);
    await fetch(`/api/assets/${asset.id}/schedules/${sid}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Preventive Maintenance Schedules
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
              <Wrench className="w-3 h-3 mr-1" />Add Schedule
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {showForm && (
          <form onSubmit={handleAdd} className="border rounded-lg p-3 mb-3 space-y-3 bg-orange-50/40">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Service Type</label>
                <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                  {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Frequency</label>
                <select value={frequencyDays} onChange={(e) => setFrequencyDays(Number(e.target.value))} className="w-full border rounded px-2 py-1.5 text-sm">
                  {FREQ_OPTIONS.map((o) => <option key={o.days} value={o.days}>{o.label} ({o.days}d)</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Next Due Date</label>
                <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Notes (optional)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. vendor name" className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-orange-500 hover:bg-orange-600" disabled={saving}>
                {saving ? "Saving…" : "Save Schedule"}
              </Button>
            </div>
          </form>
        )}

        {asset.maintenanceSchedules.length === 0 && !showForm ? (
          <p className="text-sm text-gray-400 text-center py-4">No schedules defined</p>
        ) : (
          <div className="space-y-2">
            {asset.maintenanceSchedules.map((s) => {
              const daysLeft = Math.ceil((new Date(s.nextDueDate).getTime() - Date.now()) / 86400000);
              const overdue = daysLeft < 0;
              const urgent = daysLeft >= 0 && daysLeft <= 14;
              return (
                <div key={s.id} className={`flex items-center justify-between border rounded-lg px-3 py-2 ${!s.isActive ? "opacity-50 bg-gray-50" : overdue ? "border-red-200 bg-red-50/30" : urgent ? "border-orange-200 bg-orange-50/30" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.serviceType.replace(/_/g, " ")}</p>
                    <p className="text-xs text-gray-500">
                      Every {FREQ_OPTIONS.find(o => o.days === s.frequencyDays)?.label ?? `${s.frequencyDays}d`}
                      {s.lastServiceDate && ` · Last: ${format(new Date(s.lastServiceDate), "dd MMM yy")}`}
                      {s.notes && ` · ${s.notes}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-700">{format(new Date(s.nextDueDate), "dd MMM yyyy")}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${overdue ? "bg-red-100 text-red-700" : urgent ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                        {overdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d`}
                      </span>
                    </div>
                    {canEdit && (
                      <>
                        <button onClick={() => handleToggle(s.id, s.isActive)} disabled={toggling === s.id} className="text-xs text-gray-400 hover:text-gray-600 px-1">
                          {s.isActive ? "Pause" : "Resume"}
                        </button>
                        <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} className="text-xs text-red-400 hover:text-red-600 px-1">
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const EVENT_STYLES: Record<TimelineEvent["type"], { dot: string; icon: React.ReactNode }> = {
  created:     { dot: "bg-gray-400",   icon: <Package className="w-3 h-3" /> },
  transfer:    { dot: "bg-blue-500",   icon: <ArrowRightLeft className="w-3 h-3" /> },
  maintenance: { dot: "bg-orange-500", icon: <Wrench className="w-3 h-3" /> },
  audit:       { dot: "bg-purple-500", icon: <ClipboardCheck className="w-3 h-3" /> },
};

function AssetTimeline({ asset }: { asset: Asset }) {
  const events: TimelineEvent[] = [
    {
      id: "created",
      date: new Date(asset.createdAt),
      type: "created" as const,
      title: "Asset Added",
      subtitle: `By ${asset.createdBy.name}`,
      detail: `₹${Number(asset.purchaseCost).toLocaleString("en-IN")} · ${asset.category.name}`,
    },
    ...asset.allocations.map<TimelineEvent>((a) => ({
      id: a.id,
      date: new Date(a.transferDate),
      type: "transfer",
      title: `Transferred → ${a.toLocation.name}`,
      subtitle: `${a.toDepartment.name}${a.toUser ? ` · ${a.toUser.name}` : ""}`,
      detail: `By ${a.transferredBy.name}${a.notes ? ` · "${a.notes}"` : ""}`,
      badge: a.status,
      badgeColor: a.status === "COMPLETED" ? "bg-green-100 text-green-700" : a.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700",
    })),
    ...asset.maintenance.map<TimelineEvent>((m) => ({
      id: m.id,
      date: new Date(m.serviceDate),
      type: "maintenance",
      title: m.serviceType.replace(/_/g, " "),
      subtitle: [m.vendorName, Number(m.cost) > 0 ? `₹${Number(m.cost).toLocaleString("en-IN")}` : null].filter(Boolean).join(" · ") || undefined,
      detail: m.remarks ?? undefined,
    })),
    ...asset.auditEntries
      .filter((e) => e.scannedAt)
      .map<TimelineEvent>((e) => ({
        id: e.id,
        date: new Date(e.scannedAt!),
        type: "audit",
        title: e.auditSession.name,
        subtitle: `By ${e.scannedBy.name}${e.foundLocation ? ` · Found at: ${e.foundLocation.name}` : ""}`,
        detail: e.notes ?? undefined,
        badge: e.status,
        badgeColor:
          e.status === "VERIFIED"  ? "bg-green-100 text-green-700"  :
          e.status === "MISSING"   ? "bg-red-100 text-red-700"      :
          e.status === "MISPLACED" ? "bg-orange-100 text-orange-700":
                                     "bg-blue-100 text-blue-700",
      })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No timeline events yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-2">
        <div className="relative">
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />
          <div className="space-y-0">
            {events.map((ev, i) => {
              const style = EVENT_STYLES[ev.type];
              return (
                <div key={ev.id} className={`relative flex gap-4 pb-5 ${i === events.length - 1 ? "pb-1" : ""}`}>
                  <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${style.dot} flex items-center justify-center text-white mt-0.5`}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 capitalize">{ev.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        {ev.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.badgeColor}`}>{ev.badge}</span>
                        )}
                        <span className="text-xs text-gray-400">{format(ev.date, "dd MMM yyyy")}</span>
                      </div>
                    </div>
                    {ev.subtitle && <p className="text-xs text-gray-500 mt-0.5">{ev.subtitle}</p>}
                    {ev.detail && <p className="text-xs text-gray-400 mt-0.5 italic">{ev.detail}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const DISPOSE_METHODS = ["SOLD", "SCRAPPED", "DONATED", "WRITTEN_OFF"] as const;

function DisposeModal({ asset, onClose, onSuccess }: {
  asset: Asset;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<string>("SCRAPPED");
  const [disposalDate, setDisposalDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saleValue, setSaleValue] = useState("0");
  const [buyerName, setBuyerName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/assets/${asset.id}/dispose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, disposalDate, saleValue: Number(saleValue), buyerName, remarks }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to dispose asset");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Dispose Asset</h2>
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-mono text-orange-600">{asset.assetCode}</span> · {asset.name}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disposal Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            >
              {DISPOSE_METHODS.map((m) => (
                <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disposal Date</label>
            <input
              type="date"
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale / Scrap Value (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={saleValue}
              onChange={(e) => setSaleValue(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {method === "SOLD" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Buyer / party name"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Optional notes"
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
              {loading ? "Processing…" : "Confirm Disposal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
