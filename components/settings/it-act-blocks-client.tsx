"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Info } from "lucide-react";

interface ItBlock {
  id: string; code: string; name: string; rate: number;
  description: string | null; isActive: boolean;
}

type ItForm = { code: string; name: string; rate: string; desc: string };
const EMPTY: ItForm = { code: "", name: "", rate: "0.15", desc: "" };

export function ItActBlocksClient() {
  const [items, setItems] = useState<ItBlock[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ItBlock | null>(null);
  const [form, setForm] = useState<ItForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await fetch("/api/settings/it-act-blocks");
    setItems(await r.json());
  }

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(b: ItBlock) {
    setEditing(b);
    setForm({ code: b.code, name: b.name, rate: String(b.rate), desc: b.description ?? "" });
    setOpen(true);
  }

  async function save() {
    if (!form.code || !form.name || !form.rate) { toast.error("Code, Name and Rate are required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/it-act-blocks", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editing ? { id: editing.id } : {}), code: form.code.toUpperCase(), name: form.name, rate: Number(form.rate), description: form.desc || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editing ? "Block updated" : "Block created");
      setOpen(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function del(id: string) {
    try {
      const res = await fetch("/api/settings/it-act-blocks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast.success("Block deleted"); setConfirm(null); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
  }

  const rate = Number(form.rate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IT Act — Block of Assets</h1>
          <p className="text-sm text-gray-500">Appendix I, Income Tax Rules 1962 · Written Down Value (WDV) method · {items.length} blocks</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />New Block
        </Button>
      </div>

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <strong>Block of Assets (WDV Method).</strong> All assets with the same rate form one block. Depreciation = Opening WDV × Rate.{" "}
          <strong>180-day rule:</strong> if asset put to use on/after 3 Oct (less than 180 days in FY), only 50% of the rate is allowed.
          Rates fixed by Appendix I, Income Tax Rules 1962.
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b text-xs">
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Block Name</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Code</th>
                <th className="text-center px-4 py-3 text-gray-500 font-semibold">Rate (Full year)</th>
                <th className="text-center px-4 py-3 text-gray-500 font-semibold">Rate (½ year)</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Description</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No blocks defined</td></tr>
              ) : items.map((b, i) => (
                <tr key={b.id} className={`border-b last:border-0 hover:bg-blue-50 ${i % 2 === 1 ? "bg-blue-50/20" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{b.name.replace(/^\d+%\s*[—–-]\s*/, "")}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{b.code}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-700">{(b.rate * 100).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-500">{(b.rate * 50).toFixed(0)}%</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{b.description ?? "—"}</td>
                  <td className="px-4 py-3">
                    {confirm === b.id ? (
                      <div className="flex gap-1">
                        <span className="text-xs text-gray-500">Delete?</span>
                        <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => del(b.id)}>Yes</Button>
                        <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirm(null)}>No</Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => setConfirm(b.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit IT Act Block" : "New IT Act Block"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. BLOCK-15A" className="font-mono" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate (e.g. 0.15 = 15%) *</Label>
              <Input type="number" step="0.01" min="0" max="1" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
              {rate > 0 && (
                <p className="text-xs text-blue-600">Full year: {(rate * 100).toFixed(0)}% · ½ year: {(rate * 50).toFixed(0)}%</p>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Block Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 15% — Plant & Machinery (General)" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Assets covered under this block" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={loading} className="bg-blue-600 hover:bg-blue-700">{loading ? "Saving…" : "Save Block"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
