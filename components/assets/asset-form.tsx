"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, ExternalLink } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  name: z.string().min(1),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  categoryId: z.string().min(1),
  purchaseDate: z.string().min(1),
  purchaseCost: z.number().min(0),
  gstPaid: z.number().min(0),
  invoiceNumber: z.string().optional(),
  residualValue: z.number().min(0),
  status: z.string().min(1),
  currentLocationId: z.string().min(1),
  currentDepartmentId: z.string().min(1),
  assignedUserId: z.string().optional(),
  supplierId: z.string().optional(),
  description: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  pucExpiry: z.string().optional(),
  ipConfiguration: z.string().optional(),
  serverModel: z.string().optional(),
  condition: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomField {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  code: string;
  group: string | null;
  itActBlock: string | null;
  usefulLifeCompaniesAct: number;
  itActBlockRate: number;
  depreciationMethod: string;
  isIntangible: boolean;
  customFields: unknown; // Prisma returns JsonValue; cast when used
}

interface Props {
  categories: CategoryOption[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string; locationId: string; location: { name: string } }[];
  suppliers: { id: string; name: string }[];
  users: { id: string; name: string; email: string }[];
  asset?: Partial<FormData> & { id?: string; customValues?: Record<string, string>; assignedToType?: string };
}

export function AssetForm({ categories, locations, departments, suppliers, users, asset }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(asset?.currentLocationId ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(asset?.categoryId ?? "");
  const [selectedSupplierId, setSelectedSupplierId] = useState(asset?.supplierId ?? "");
  const [selectedDeptId, setSelectedDeptId] = useState(asset?.currentDepartmentId ?? "");
  const [selectedUserId, setSelectedUserId] = useState(asset?.assignedUserId ?? "");
  const [assignedToType, setAssignedToType] = useState<"OFFICE" | "USER">(
    (asset?.assignedToType as "OFFICE" | "USER") ?? "OFFICE"
  );
  const [selectedStatus, setSelectedStatus] = useState(asset?.status ?? "ACTIVE");
  const [selectedCondition, setSelectedCondition] = useState(asset?.condition ?? "NEW");
  const [customValues, setCustomValues] = useState<Record<string, string>>(asset?.customValues ?? {});

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: asset?.name ?? "",
      make: asset?.make ?? "",
      model: asset?.model ?? "",
      serialNumber: asset?.serialNumber ?? "",
      categoryId: asset?.categoryId ?? "",
      purchaseDate: asset?.purchaseDate?.slice(0, 10) ?? "",
      purchaseCost: Number(asset?.purchaseCost ?? 0),
      gstPaid: Number(asset?.gstPaid ?? 0),
      invoiceNumber: asset?.invoiceNumber ?? "",
      residualValue: Number(asset?.residualValue ?? 0),
      status: asset?.status ?? "ACTIVE",
      currentLocationId: asset?.currentLocationId ?? "",
      currentDepartmentId: asset?.currentDepartmentId ?? "",
      assignedUserId: asset?.assignedUserId ?? "",
      supplierId: asset?.supplierId ?? "",
      description: asset?.description ?? "",
      warrantyExpiry: asset?.warrantyExpiry?.slice(0, 10) ?? "",
      condition: asset?.condition ?? "NEW",
    },
  });

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedCategoryFields = (Array.isArray(selectedCategory?.customFields) ? selectedCategory.customFields : []) as CustomField[];
  const filteredDepts = departments.filter(d => !selectedLocationId || d.locationId === selectedLocationId);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const url = asset?.id ? `/api/assets/${asset.id}` : "/api/assets";
      const method = asset?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          customValues,
          assignedToType,
          assignedUserId: assignedToType === "USER" ? data.assignedUserId : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save asset");
      }
      const saved = await res.json();
      toast.success(asset?.id ? "Asset updated" : "Asset created");
      router.push(`/assets/${saved.id}`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function CategoryTaxInfo() {
    if (!selectedCategory) return null;
    const rate = selectedCategory.itActBlockRate;
    return (
      <div className="mt-1.5 bg-blue-50 border border-blue-100 rounded-md px-3 py-2 text-xs space-y-0.5">
        <p className="font-medium text-blue-800">
          {selectedCategory.isIntangible ? "Intangible Asset" : "Tangible Asset"} · {selectedCategory.group ?? selectedCategory.name}
        </p>
        <p className="text-blue-700">
          Companies Act: {selectedCategory.usefulLifeCompaniesAct} yrs ({selectedCategory.depreciationMethod})
        </p>
        <p className="text-blue-700">
          IT Act: First half (Apr–Sep) <strong>{(rate * 100).toFixed(0)}%</strong> · Second half (Oct–Mar) <strong>{(rate * 50).toFixed(0)}%</strong>
          {selectedCategory.itActBlock && <span className="text-blue-500"> ({selectedCategory.itActBlock})</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{asset?.id ? "Edit Asset" : "Add New Asset"}</h1>
          <p className="text-sm text-gray-500">Fill in asset details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Asset Name *</Label>
              <Input {...register("name")} placeholder="e.g. Dell Laptop i5" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Category *</Label>
                <a href="/settings/categories" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-orange-600 hover:underline">
                  <ExternalLink className="w-3 h-3" />Add New
                </a>
              </div>
              <Select
                value={selectedCategoryId}
                onValueChange={(v: string | null) => {
                  if (v) { setValue("categoryId", v); setSelectedCategoryId(v); setCustomValues({}); }
                }}
              >
                <SelectTrigger>
                  <SelectDisplay value={selectedCategoryId} placeholder="Select category">
                    {categories.find(c => c.id === selectedCategoryId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-red-500">Required</p>}
              <CategoryTaxInfo />
            </div>
            <div className="space-y-1.5">
              <Label>Make / Brand</Label>
              <Input {...register("make")} placeholder="e.g. Dell" />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input {...register("model")} placeholder="e.g. Latitude 5520" />
            </div>
            <div className="space-y-1.5">
              <Label>Serial Number</Label>
              <Input {...register("serialNumber")} placeholder="e.g. SN123456" />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={selectedCondition} onValueChange={(v: string | null) => { if (v) { setValue("condition", v); setSelectedCondition(v); } }}>
                <SelectTrigger>
                  <SelectDisplay value={selectedCondition}>{selectedCondition}</SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {["NEW", "GOOD", "WORKING", "OLD", "WORKING & NEW"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select value={selectedStatus} onValueChange={(v: string | null) => { if (v) { setValue("status", v); setSelectedStatus(v); } }}>
                <SelectTrigger>
                  <SelectDisplay value={selectedStatus}>{selectedStatus.replace(/_/g, " ")}</SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {["PROCURED", "IN_TRANSIT", "ACTIVE", "IN_REPAIR", "IDLE", "RETIRED", "DISPOSED"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>IP Configuration</Label>
              <Input {...register("ipConfiguration")} placeholder="e.g. 192.168.1.100" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Description</Label>
              <Textarea {...register("description")} rows={2} placeholder="Additional notes…" />
            </div>
          </CardContent>
        </Card>

        {/* Category-specific custom fields */}
        {selectedCategoryFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{selectedCategory?.name} – Specific Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCategoryFields.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}{field.required && " *"}</Label>
                  {field.type === "select" && field.options ? (
                    <Select
                      value={customValues[field.key] ?? ""}
                      onValueChange={(v: string | null) => {
                        if (v !== null) setCustomValues(prev => ({ ...prev, [field.key]: v }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectDisplay value={customValues[field.key] ?? ""} placeholder={`Select ${field.label}`}>
                          {customValues[field.key]}
                        </SelectDisplay>
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type ?? "text"}
                      value={customValues[field.key] ?? ""}
                      onChange={e => setCustomValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.label}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Purchase &amp; Financial</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Purchase Date *</Label>
              <Input type="date" {...register("purchaseDate")} />
              {errors.purchaseDate && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Purchase Cost (₹) *</Label>
              <Input type="number" step="0.01" {...register("purchaseCost", { valueAsNumber: true })} />
              {errors.purchaseCost && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label>GST Paid (₹)</Label>
              <Input type="number" step="0.01" {...register("gstPaid", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Residual Value (₹) *</Label>
              <Input type="number" step="0.01" {...register("residualValue", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input {...register("invoiceNumber")} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Supplier</Label>
                <a href="/settings/suppliers" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-orange-600 hover:underline">
                  <ExternalLink className="w-3 h-3" />Add New
                </a>
              </div>
              <Select value={selectedSupplierId} onValueChange={(v: string | null) => { if (v) { setValue("supplierId", v); setSelectedSupplierId(v); } }}>
                <SelectTrigger>
                  <SelectDisplay value={selectedSupplierId} placeholder="Select supplier">
                    {suppliers.find(s => s.id === selectedSupplierId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Location &amp; Assignment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Select
                value={selectedLocationId}
                onValueChange={(v: string | null) => {
                  if (v) { setValue("currentLocationId", v); setSelectedLocationId(v); setValue("currentDepartmentId", ""); setSelectedDeptId(""); }
                }}
              >
                <SelectTrigger>
                  <SelectDisplay value={selectedLocationId} placeholder="Select location">
                    {locations.find(l => l.id === selectedLocationId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.currentLocationId && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Department / Office *</Label>
              <Select value={selectedDeptId} onValueChange={(v: string | null) => { if (v) { setValue("currentDepartmentId", v); setSelectedDeptId(v); } }}>
                <SelectTrigger>
                  <SelectDisplay value={selectedDeptId} placeholder="Select department">
                    {filteredDepts.find(d => d.id === selectedDeptId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {filteredDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.currentDepartmentId && <p className="text-xs text-red-500">Required</p>}
            </div>

            {/* Assigned-to entity — compulsory: Office OR specific User */}
            <div className="space-y-1.5 md:col-span-2">
              <Label>Assigned To *</Label>
              <p className="text-xs text-gray-400">Choose whether this asset is held by the office/department or a specific employee.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAssignedToType("OFFICE"); setValue("assignedUserId", undefined); setSelectedUserId(""); }}
                  className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${assignedToType === "OFFICE" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"}`}
                >
                  🏢 Office / Department
                </button>
                <button
                  type="button"
                  onClick={() => setAssignedToType("USER")}
                  className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${assignedToType === "USER" ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"}`}
                >
                  👤 Specific Employee
                </button>
              </div>
            </div>

            {assignedToType === "USER" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Employee *</Label>
                <Select value={selectedUserId} onValueChange={(v: string | null) => { if (v) { setValue("assignedUserId", v); setSelectedUserId(v); } }}>
                  <SelectTrigger>
                    <SelectDisplay value={selectedUserId} placeholder="Select employee">
                      {(() => { const u = users.find(u => u.id === selectedUserId); return u ? `${u.name} (${u.email})` : undefined; })()}
                    </SelectDisplay>
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
                  </SelectContent>
                </Select>
                {assignedToType === "USER" && !selectedUserId && (
                  <p className="text-xs text-red-500">Please select an employee</p>
                )}
              </div>
            )}

            {assignedToType === "OFFICE" && selectedDeptId && (
              <div className="md:col-span-2">
                <div className="bg-orange-50 border border-orange-100 rounded-md px-3 py-2 text-xs text-orange-700">
                  Asset will be held by: <strong>{filteredDepts.find(d => d.id === selectedDeptId)?.name ?? "selected department"}</strong>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Warranty &amp; Expiry</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Warranty Expiry</Label>
              <Input type="date" {...register("warrantyExpiry")} />
            </div>
            <div className="space-y-1.5">
              <Label>Insurance Expiry</Label>
              <Input type="date" {...register("insuranceExpiry")} />
            </div>
            <div className="space-y-1.5">
              <Label>PUC Expiry</Label>
              <Input type="date" {...register("pucExpiry")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving…" : asset?.id ? "Update Asset" : "Create Asset"}
          </Button>
          <Link href="/assets">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
