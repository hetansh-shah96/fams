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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, ExternalLink, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
  customFields: unknown;
}

interface Props {
  categories: CategoryOption[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string; locationId: string; location: { name: string } }[];
  suppliers: { id: string; name: string }[];
  users: { id: string; name: string; email: string }[];
  asset?: Partial<FormData> & { id?: string; customValues?: Record<string, string>; assignedToType?: string };
}

const TABS = ["basic", "classification", "financial", "location", "compliance"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  basic: "1. Asset Details",
  classification: "2. Classification",
  financial: "3. Financial",
  location: "4. Location",
  compliance: "5. Compliance",
};

const TAB_FIELDS: Record<Tab, (keyof FormData)[]> = {
  basic: ["name"],
  classification: ["categoryId"],
  financial: ["purchaseDate", "purchaseCost", "residualValue"],
  location: ["currentLocationId", "currentDepartmentId"],
  compliance: [],
};

export function AssetForm({ categories, locations, departments, suppliers, users, asset }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("basic");

  // Category selection — two-step: CA group → specific sub-category
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    if (!asset?.categoryId) return "";
    return categories.find(c => c.id === asset.categoryId)?.group ?? "";
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState(asset?.categoryId ?? "");

  const [selectedLocationId, setSelectedLocationId] = useState(asset?.currentLocationId ?? "");
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
      insuranceExpiry: asset?.insuranceExpiry?.slice(0, 10) ?? "",
      pucExpiry: asset?.pucExpiry?.slice(0, 10) ?? "",
      condition: asset?.condition ?? "NEW",
    },
  });

  // Derived values
  const caGroups = [...new Set(categories.map(c => c.group).filter(Boolean))] as string[];
  const subCategories = selectedGroup ? categories.filter(c => c.group === selectedGroup) : [];
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const selectedCategoryFields = (Array.isArray(selectedCategory?.customFields)
    ? selectedCategory.customFields
    : []) as CustomField[];
  const filteredDepts = departments.filter(d => !selectedLocationId || d.locationId === selectedLocationId);

  function hasTabErrors(tab: Tab): boolean {
    return TAB_FIELDS[tab].some(f => !!errors[f]);
  }

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
      // Jump to first tab that has errors
      const firstErrorTab = TABS.find(t => hasTabErrors(t));
      if (firstErrorTab) setActiveTab(firstErrorTab);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/assets">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{asset?.id ? "Edit Asset" : "Add New Asset"}</h1>
          <p className="text-sm text-gray-500">Complete all tabs then save</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          {/* Tab bar */}
          <div className="border-b bg-gray-50 px-1 pt-1">
            <Tabs value={activeTab} onValueChange={(v: string | null) => { if (v) setActiveTab(v as Tab); }}>
              <TabsList variant="line" className="w-full justify-start gap-0">
                {TABS.map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="relative px-4 py-2.5 text-sm rounded-none"
                  >
                    {hasTabErrors(tab) && (
                      <AlertCircle className="w-3 h-3 text-red-500 mr-1 inline" />
                    )}
                    {TAB_LABELS[tab]}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* ── Tab 1: Asset Details ── */}
              <TabsContent value="basic" className="p-6">
                <p className="text-xs text-gray-400 mb-4">Identify the asset — what it is, who made it, its condition.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Asset Name <span className="text-red-500">*</span></Label>
                    <Input {...register("name")} placeholder="e.g. Dell Latitude 5520 Laptop" className="text-base" />
                    {errors.name && <p className="text-xs text-red-500">Asset name is required</p>}
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
                    <Input {...register("serialNumber")} placeholder="e.g. SN123456789" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Condition</Label>
                    <Select value={selectedCondition} onValueChange={(v: string | null) => { if (v) { setValue("condition", v); setSelectedCondition(v); } }}>
                      <SelectTrigger>
                        <SelectDisplay value={selectedCondition}>{selectedCondition}</SelectDisplay>
                      </SelectTrigger>
                      <SelectContent>
                        {["NEW", "GOOD", "WORKING", "OLD"].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status <span className="text-red-500">*</span></Label>
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
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Description / Remarks</Label>
                    <Textarea {...register("description")} rows={3} placeholder="Additional notes about this asset…" />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button type="button" onClick={() => setActiveTab("classification")} className="bg-orange-500 hover:bg-orange-600">
                    Next: Classification →
                  </Button>
                </div>
              </TabsContent>

              {/* ── Tab 2: Classification ── */}
              <TabsContent value="classification" className="p-6">
                <p className="text-xs text-gray-400 mb-4">
                  Select the asset class under <strong>Companies Act 2013 (Schedule II)</strong> and review the corresponding <strong>Income Tax Act block rate</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Step 1: CA Group */}
                  <div className="space-y-1.5">
                    <Label>Companies Act — Asset Group <span className="text-red-500">*</span></Label>
                    <Select
                      value={selectedGroup}
                      onValueChange={(v: string | null) => {
                        if (v) {
                          setSelectedGroup(v);
                          setSelectedCategoryId("");
                          setValue("categoryId", "");
                          setCustomValues({});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectDisplay value={selectedGroup} placeholder="Select asset group">
                          {selectedGroup}
                        </SelectDisplay>
                      </SelectTrigger>
                      <SelectContent>
                        {caGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">Broad classification per Schedule II of Companies Act 2013</p>
                  </div>

                  {/* Step 2: Specific sub-category */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Asset Sub-type <span className="text-red-500">*</span></Label>
                      <a href="/settings/categories" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-orange-600 hover:underline">
                        <ExternalLink className="w-3 h-3" />Manage
                      </a>
                    </div>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={(v: string | null) => {
                        if (v) { setValue("categoryId", v); setSelectedCategoryId(v); setCustomValues({}); }
                      }}
                    >
                      <SelectTrigger disabled={!selectedGroup}>
                        <SelectDisplay value={selectedCategoryId} placeholder={selectedGroup ? "Select sub-type" : "Select group first"}>
                          {categories.find(c => c.id === selectedCategoryId)?.name}
                        </SelectDisplay>
                      </SelectTrigger>
                      <SelectContent>
                        {subCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && <p className="text-xs text-red-500">Please select an asset category</p>}
                    <p className="text-xs text-gray-400">Specific type within the group (affects useful life & depreciation rate)</p>
                  </div>

                  {/* Companies Act info */}
                  {selectedCategory && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Companies Act 2013 (Schedule II)</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-600">Asset Class</span>
                            <span className="font-medium text-blue-900">{selectedCategory.group}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">Useful Life</span>
                            <span className="font-medium text-blue-900">{selectedCategory.usefulLifeCompaniesAct} years</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">Method</span>
                            <span className="font-medium text-blue-900">
                              {selectedCategory.depreciationMethod === "SLM" ? "SLM (Straight Line)" : "WDV (Written Down Value)"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-600">Type</span>
                            <span className="font-medium text-blue-900">{selectedCategory.isIntangible ? "Intangible" : "Tangible"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">Income Tax Act — Block Rate</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-green-600">Block</span>
                            <span className="font-medium text-green-900 text-right text-xs leading-tight">{selectedCategory.itActBlock ?? "—"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Full year rate</span>
                            <span className="font-medium text-green-900">{(selectedCategory.itActBlockRate * 100).toFixed(0)}% WDV</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Half-year rate</span>
                            <span className="font-medium text-green-900">{(selectedCategory.itActBlockRate * 50).toFixed(0)}% WDV</span>
                          </div>
                          <p className="text-xs text-green-600 mt-1">Half-year rule applies when asset is put to use after 3 Oct (less than 180 days in the FY)</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* IP Configuration */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>IP Configuration <span className="text-gray-400 text-xs font-normal">(for networked assets)</span></Label>
                    <Input {...register("ipConfiguration")} placeholder="e.g. 192.168.1.100" className="max-w-xs" />
                  </div>

                  {/* Category custom fields */}
                  {selectedCategoryFields.length > 0 && (
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">{selectedCategory?.name} — Specific Fields</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedCategoryFields.map(field => (
                          <div key={field.key} className="space-y-1.5">
                            <Label>{field.label}{field.required && <span className="text-red-500"> *</span>}</Label>
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
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("basic")}>← Back</Button>
                  <Button type="button" onClick={() => setActiveTab("financial")} className="bg-orange-500 hover:bg-orange-600">Next: Financial →</Button>
                </div>
              </TabsContent>

              {/* ── Tab 3: Financial ── */}
              <TabsContent value="financial" className="p-6">
                <p className="text-xs text-gray-400 mb-4">Purchase details, cost, and supplier information. These values are used in depreciation calculations.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label>Purchase Date <span className="text-red-500">*</span></Label>
                    <Input type="date" {...register("purchaseDate")} />
                    {errors.purchaseDate && <p className="text-xs text-red-500">Required</p>}
                    <p className="text-xs text-gray-400">Date asset was purchased / put to use — determines which FY depreciation starts</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Purchase Cost (₹) <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" min="0" {...register("purchaseCost", { valueAsNumber: true })} placeholder="0.00" />
                    {errors.purchaseCost && <p className="text-xs text-red-500">Required</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>GST Paid (₹)</Label>
                    <Input type="number" step="0.01" min="0" {...register("gstPaid", { valueAsNumber: true })} placeholder="0.00" />
                    <p className="text-xs text-gray-400">GST amount — for records only, not added to cost for depreciation</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Residual / Scrap Value (₹) <span className="text-red-500">*</span></Label>
                    <Input type="number" step="0.01" min="0" {...register("residualValue", { valueAsNumber: true })} placeholder="0.00" />
                    {errors.residualValue && <p className="text-xs text-red-500">Required</p>}
                    <p className="text-xs text-gray-400">Expected value at end of useful life (SLM stops depreciating at this value)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Invoice / Bill Number</Label>
                    <Input {...register("invoiceNumber")} placeholder="e.g. INV-2024-001" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Supplier / Vendor</Label>
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
                </div>
                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("classification")}>← Back</Button>
                  <Button type="button" onClick={() => setActiveTab("location")} className="bg-orange-500 hover:bg-orange-600">Next: Location →</Button>
                </div>
              </TabsContent>

              {/* ── Tab 4: Location & Assignment ── */}
              <TabsContent value="location" className="p-6">
                <p className="text-xs text-gray-400 mb-4">Where is the asset currently held, and who is responsible for it?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label>Branch / Location <span className="text-red-500">*</span></Label>
                    <Select
                      value={selectedLocationId}
                      onValueChange={(v: string | null) => {
                        if (v) {
                          setValue("currentLocationId", v);
                          setSelectedLocationId(v);
                          setValue("currentDepartmentId", "");
                          setSelectedDeptId("");
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectDisplay value={selectedLocationId} placeholder="Select branch/location">
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
                    <Label>Department / Office <span className="text-red-500">*</span></Label>
                    <Select
                      value={selectedDeptId}
                      onValueChange={(v: string | null) => { if (v) { setValue("currentDepartmentId", v); setSelectedDeptId(v); } }}
                    >
                      <SelectTrigger disabled={!selectedLocationId}>
                        <SelectDisplay value={selectedDeptId} placeholder={selectedLocationId ? "Select department" : "Select location first"}>
                          {filteredDepts.find(d => d.id === selectedDeptId)?.name}
                        </SelectDisplay>
                      </SelectTrigger>
                      <SelectContent>
                        {filteredDepts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.currentDepartmentId && <p className="text-xs text-red-500">Required</p>}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Custody / Assignment</Label>
                    <p className="text-xs text-gray-400">Is this asset held by the department or issued to a specific employee?</p>
                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => { setAssignedToType("OFFICE"); setValue("assignedUserId", undefined); setSelectedUserId(""); }}
                        className={cn(
                          "py-3 px-4 rounded-lg border text-sm font-medium transition-colors text-left",
                          assignedToType === "OFFICE"
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                        )}
                      >
                        <span className="block text-base mb-0.5">🏢</span>
                        Office / Department
                        <span className={cn("block text-xs mt-0.5", assignedToType === "OFFICE" ? "text-orange-100" : "text-gray-400")}>
                          Asset held by the department
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignedToType("USER")}
                        className={cn(
                          "py-3 px-4 rounded-lg border text-sm font-medium transition-colors text-left",
                          assignedToType === "USER"
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-700 border-gray-200 hover:border-orange-300"
                        )}
                      >
                        <span className="block text-base mb-0.5">👤</span>
                        Specific Employee
                        <span className={cn("block text-xs mt-0.5", assignedToType === "USER" ? "text-orange-100" : "text-gray-400")}>
                          Issued to an individual
                        </span>
                      </button>
                    </div>
                  </div>

                  {assignedToType === "USER" && (
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Employee <span className="text-red-500">*</span></Label>
                      <Select
                        value={selectedUserId}
                        onValueChange={(v: string | null) => { if (v) { setValue("assignedUserId", v); setSelectedUserId(v); } }}
                      >
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
                      <div className="bg-orange-50 border border-orange-100 rounded-md px-4 py-2.5 text-sm text-orange-800">
                        Asset will be held by: <strong>{filteredDepts.find(d => d.id === selectedDeptId)?.name ?? "selected department"}</strong>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("financial")}>← Back</Button>
                  <Button type="button" onClick={() => setActiveTab("compliance")} className="bg-orange-500 hover:bg-orange-600">Next: Compliance →</Button>
                </div>
              </TabsContent>

              {/* ── Tab 5: Compliance ── */}
              <TabsContent value="compliance" className="p-6">
                <p className="text-xs text-gray-400 mb-4">Warranty, insurance, and PUC expiry dates. Alerts will be triggered based on your alert configuration.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <Label>Warranty Expiry</Label>
                    <Input type="date" {...register("warrantyExpiry")} />
                    <p className="text-xs text-gray-400">Date manufacturer warranty ends</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Insurance Expiry</Label>
                    <Input type="date" {...register("insuranceExpiry")} />
                    <p className="text-xs text-gray-400">Asset insurance renewal date</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>PUC Expiry</Label>
                    <Input type="date" {...register("pucExpiry")} />
                    <p className="text-xs text-gray-400">Pollution Under Control certificate (vehicles)</p>
                  </div>
                </div>
                <div className="flex justify-between mt-8">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("location")}>← Back</Button>
                  <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 px-8">
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Saving…" : asset?.id ? "Update Asset" : "Create Asset"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sticky bottom bar with save + cancel always visible */}
        <div className="mt-4 flex items-center justify-between bg-white border rounded-lg px-5 py-3 shadow-sm">
          <Link href="/assets">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Tab {TABS.indexOf(activeTab) + 1} of {TABS.length}</span>
            <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving…" : asset?.id ? "Update Asset" : "Save Asset"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
