"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Building2 } from "lucide-react";

interface Company { id: string; code: string; name: string; }
interface Location {
  id: string; code: string; name: string; city?: string; state?: string;
  pincode?: string; address?: string; companyId?: string;
  company?: { name: string };
  isActive: boolean;
}

const EMPTY = { code: "", name: "", address: "", city: "", state: "", pincode: "", companyId: "" };

export default function LocationsPage() {
  const [items, setItems] = useState<Location[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  useEffect(() => { load(); loadCompanies(); }, []);

  async function load() {
    const res = await fetch("/api/settings/locations");
    setItems(await res.json());
  }
  async function loadCompanies() {
    const res = await fetch("/api/settings/company");
    if (res.ok) setCompanies(await res.json());
  }

  function openCreate() { setEditing(null); setForm(EMPTY); setSelectedCompanyId(""); setOpen(true); }
  function openEdit(item: Location) {
    setEditing(item);
    setForm({ code: item.code, name: item.name, address: item.address ?? "", city: item.city ?? "", state: item.state ?? "", pincode: item.pincode ?? "", companyId: item.companyId ?? "" });
    setSelectedCompanyId(item.companyId ?? "");
    setOpen(true);
  }

  async function handleSave() {
    if (!form.code || !form.name) { toast.error("Code and Name required"); return; }
    setLoading(true);
    try {
      const payload = { ...editing ? { id: editing.id } : {}, ...form, companyId: selectedCompanyId || null };
      const res = await fetch("/api/settings/locations", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editing ? "Location updated" : "Location created");
      setOpen(false); load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally { setLoading(false); }
  }

  // Group locations by company
  const grouped = items.reduce<Record<string, Location[]>>((acc, loc) => {
    const key = loc.company?.name ?? "— No Company Assigned —";
    (acc[key] ??= []).push(loc);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations / Branches</h1>
          <p className="text-sm text-gray-500">{items.length} branches · grouped by company</p>
        </div>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />Add Branch
        </Button>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([companyName, locs]) => (
        <div key={companyName} className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-orange-50 border-b px-4 py-2.5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-sm text-gray-700">{companyName}</span>
            <span className="text-xs text-gray-400">({locs.length} branches)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs">
                {["Code", "Name", "City", "State", "Pincode", ""].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locs.map((loc, i) => (
                <tr key={loc.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-2.5"><span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{loc.code}</span></td>
                  <td className="px-4 py-2.5 font-medium">{loc.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{loc.city ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{loc.state ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-500">{loc.pincode ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}><Pencil className="w-3.5 h-3.5" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Branch" : "Add Branch"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="e.g. MUM-HO" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Branch Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mumbai Head Office" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Company</Label>
              <Select value={selectedCompanyId} onValueChange={(v: string | null) => { if (v) setSelectedCompanyId(v); }}>
                <SelectTrigger>
                  <SelectDisplay value={selectedCompanyId} placeholder="Select company (optional)">
                    {companies.find(c => c.id === selectedCompanyId)?.name}
                  </SelectDisplay>
                </SelectTrigger>
                <SelectContent>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Street address" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Pincode</Label>
              <Input value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Saving…" : "Save Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
