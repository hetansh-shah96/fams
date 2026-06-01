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
import { ArrowLeft, ArrowRightLeft } from "lucide-react";
import Link from "next/link";

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  currentLocationId: string;
  currentDepartmentId: string;
}

interface Props {
  assets: Asset[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string; locationId: string }[];
  users: { id: string; name: string; email: string }[];
  defaultAssetId?: string;
}

export function TransferForm({ assets, locations, departments, users, defaultAssetId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [assetId, setAssetId] = useState(defaultAssetId ?? "");
  const [toLocationId, setToLocationId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const filteredDepts = departments.filter((d) => !toLocationId || d.locationId === toLocationId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assetId || !toLocationId || !toDepartmentId) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId, toLocationId, toDepartmentId, toUserId: toUserId || null, transferDate, notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success("Transfer completed");
      router.push("/transfers");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/transfers"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Transfer</h1>
          <p className="text-sm text-gray-500">Move an asset to a new location or department</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-orange-500" />Transfer Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Asset *</Label>
              <Select onValueChange={(v: string | null) => v && setAssetId(v)} defaultValue={defaultAssetId}>
                <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                <SelectContent>
                  {assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.assetCode})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Transfer Date *</Label>
              <Input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>To Location *</Label>
                <Select onValueChange={(v: string | null) => { if (v) { setToLocationId(v); setToDepartmentId(""); } }}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To Department *</Label>
                <Select onValueChange={(v: string | null) => v && setToDepartmentId(v)} value={toDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {filteredDepts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Assign To Employee</Label>
              <Select onValueChange={(v: string | null) => v && setToUserId(v)}>
                <SelectTrigger><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Transfer reason or notes..." />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                {loading ? "Processing..." : "Complete Transfer"}
              </Button>
              <Link href="/transfers"><Button variant="outline" type="button">Cancel</Button></Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
