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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
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

interface Props {
  categories: { id: string; name: string; code: string }[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string; locationId: string; location: { name: string } }[];
  suppliers: { id: string; name: string }[];
  users: { id: string; name: string; email: string }[];
  asset?: Partial<FormData> & { id?: string };
}

export function AssetForm({ categories, locations, departments, suppliers, users, asset }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(asset?.currentLocationId ?? "");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
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

  const filteredDepts = departments.filter((d) => !selectedLocationId || d.locationId === selectedLocationId);

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const url = asset?.id ? `/api/assets/${asset.id}` : "/api/assets";
      const method = asset?.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save asset");
      }
      const saved = await res.json();
      toast.success(asset?.id ? "Asset updated" : "Asset created");
      router.push(`/assets/${saved.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/assets">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
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
              <Label>Category *</Label>
              <Select onValueChange={(v: string | null) => v && setValue("categoryId", v)} defaultValue={asset?.categoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-red-500">Required</p>}
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
              <Select onValueChange={(v: string | null) => v && setValue("condition", v)} defaultValue={asset?.condition ?? "NEW"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["NEW","GOOD","WORKING","OLD","WORKING &NEW"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select onValueChange={(v: string | null) => v && setValue("status", v)} defaultValue={asset?.status ?? "ACTIVE"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PROCURED","IN_TRANSIT","ACTIVE","IN_REPAIR","IDLE","RETIRED","DISPOSED"].map((s) => (
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
              <Textarea {...register("description")} rows={2} placeholder="Additional notes..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Purchase & Financial</CardTitle></CardHeader>
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
              <Label>Supplier</Label>
              <Select onValueChange={(v: string | null) => v && setValue("supplierId", v)} defaultValue={asset?.supplierId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Location & Assignment</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Select
                onValueChange={(v: string | null) => { if (v) { setValue("currentLocationId", v); setSelectedLocationId(v); setValue("currentDepartmentId", ""); } }}
                defaultValue={asset?.currentLocationId}
              >
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.currentLocationId && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select onValueChange={(v: string | null) => v && setValue("currentDepartmentId", v)} defaultValue={asset?.currentDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {filteredDepts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.currentDepartmentId && <p className="text-xs text-red-500">Required</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select onValueChange={(v: string | null) => v && setValue("assignedUserId", v)} defaultValue={asset?.assignedUserId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Warranty & Expiry</CardTitle></CardHeader>
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
            {loading ? "Saving..." : asset?.id ? "Update Asset" : "Create Asset"}
          </Button>
          <Link href="/assets">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
