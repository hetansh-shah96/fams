"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const SERVICE_TYPES = [
  "AMC_VISIT", "BREAKDOWN_REPAIR", "SCHEDULED_SERVICE",
  "INSURANCE_RENEWAL", "PUC_RENEWAL", "WARRANTY_CLAIM", "OTHER",
];

interface Props {
  assets: { id: string; assetCode: string; name: string }[];
  defaultAssetId?: string;
}

export function MaintenanceForm({ assets, defaultAssetId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assetId, setAssetId] = useState(defaultAssetId ?? "");
  const [serviceType, setServiceType] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextDueDate, setNextDueDate] = useState("");
  const [cost, setCost] = useState("0");
  const [remarks, setRemarks] = useState("");
  const [odometer, setOdometer] = useState("");
  const [clickCount, setClickCount] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !serviceType) { toast.error("Asset and service type are required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId, serviceType, vendorName, vendorContact, serviceDate,
          nextDueDate: nextDueDate || null,
          cost: Number(cost),
          remarks,
          odometer: odometer ? Number(odometer) : null,
          clickCount: clickCount ? Number(clickCount) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Maintenance log added");
      router.push("/maintenance");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/maintenance"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Maintenance Log</h1>
          <p className="text-sm text-gray-500">Record a service, repair, or renewal event</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base">Service Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Asset *</Label>
              <Select onValueChange={(v: string | null) => v && setAssetId(v)} defaultValue={defaultAssetId}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>
                  {assets.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.assetCode})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Service Type *</Label>
                <Select onValueChange={(v: string | null) => v && setServiceType(v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cost (₹)</Label>
                <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Vendor Name</Label>
                <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor Contact</Label>
                <Input value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Service Date *</Label>
                <Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next Due Date</Label>
                <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Odometer (km) – for vehicles</Label>
                <Input type="number" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Click Count – for printers</Label>
                <Input type="number" value={clickCount} onChange={(e) => setClickCount(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                <Save className="w-4 h-4 mr-2" />{loading ? "Saving..." : "Save Log"}
              </Button>
              <Link href="/maintenance"><Button variant="outline" type="button">Cancel</Button></Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
