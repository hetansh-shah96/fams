"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PO_STATUSES = ["DRAFT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"] as const;

interface Supplier { id: string; name: string; code: string }

interface Props {
  suppliers: Supplier[];
  po?: {
    id: string; poNumber: string; supplierId: string; poDate: string;
    expectedDelivery: string | null; totalAmount: string; status: string; notes: string | null;
  };
}

export function PurchaseOrderForm({ suppliers, po }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [supplierId, setSupplierId] = useState(po?.supplierId ?? "");
  const [status, setStatus] = useState(po?.status ?? "DRAFT");
  const [form, setForm] = useState({
    poNumber: po?.poNumber ?? "",
    poDate: po?.poDate?.slice(0, 10) ?? format(new Date(), "yyyy-MM-dd"),
    expectedDelivery: po?.expectedDelivery?.slice(0, 10) ?? "",
    totalAmount: po?.totalAmount ? String(Number(po.totalAmount)) : "",
    notes: po?.notes ?? "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) { toast.error("Select a supplier"); return; }
    if (!form.totalAmount || isNaN(Number(form.totalAmount))) { toast.error("Enter a valid total amount"); return; }

    setLoading(true);
    try {
      const url = po ? `/api/purchase-orders/${po.id}` : "/api/purchase-orders";
      const method = po ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, supplierId, status, totalAmount: Number(form.totalAmount) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const saved = await res.json();
      toast.success(po ? "PO updated" : "PO created");
      router.push(`/purchase-orders/${saved.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{po ? "Edit Purchase Order" : "New Purchase Order"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label>PO Number <span className="text-red-500">*</span></Label>
            <Input value={form.poNumber} onChange={e => set("poNumber", e.target.value)} placeholder="e.g. PO-2026-001" required />
          </div>
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: string | null) => { if (v) setStatus(v); }}>
              <SelectTrigger><SelectDisplay value={status} placeholder="Select status">{status.replace(/_/g, " ")}</SelectDisplay></SelectTrigger>
              <SelectContent>
                {PO_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Supplier <span className="text-red-500">*</span></Label>
          <Select value={supplierId} onValueChange={(v: string | null) => { if (v) setSupplierId(v); }}>
            <SelectTrigger>
              <SelectDisplay value={supplierId} placeholder="Select supplier">
                {suppliers.find(s => s.id === supplierId)?.name}
              </SelectDisplay>
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label>PO Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={form.poDate} onChange={e => set("poDate", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Expected Delivery</Label>
            <Input type="date" value={form.expectedDelivery} onChange={e => set("expectedDelivery", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Total Amount (₹) <span className="text-red-500">*</span></Label>
          <Input type="number" min="0" step="0.01" value={form.totalAmount} onChange={e => set("totalAmount", e.target.value)} placeholder="0.00" required />
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
            placeholder="Terms, delivery address, special instructions…"
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/purchase-orders"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />{loading ? "Saving…" : po ? "Update PO" : "Create PO"}
          </Button>
        </div>
      </form>
    </div>
  );
}
