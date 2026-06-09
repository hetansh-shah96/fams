"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/settings/delete-confirm-dialog";

const CA_PRESETS = [
  { label: "Buildings – RCC Frame (Residential)",    group: "Buildings",                    life: 60, method: "SLM", intangible: false },
  { label: "Buildings – Other Structures",            group: "Buildings",                    life: 30, method: "SLM", intangible: false },
  { label: "Buildings – Temporary Structures",        group: "Buildings",                    life: 3,  method: "SLM", intangible: false },
  { label: "Computers & Data Processing",             group: "Computers & Data Processing",  life: 3,  method: "SLM", intangible: false },
  { label: "Furniture & Fittings",                    group: "Furniture & Fittings",         life: 10, method: "SLM", intangible: false },
  { label: "Office Equipment",                        group: "Plant & Machinery",            life: 5,  method: "SLM", intangible: false },
  { label: "Plant & Machinery – General",             group: "Plant & Machinery",            life: 15, method: "SLM", intangible: false },
  { label: "Plant & Machinery – Continuous Process",  group: "Plant & Machinery",            life: 25, method: "SLM", intangible: false },
  { label: "Vehicles – Motor",                        group: "Vehicles",                     life: 8,  method: "WDV", intangible: false },
  { label: "Vehicles – Ships",                        group: "Vehicles",                     life: 20, method: "SLM", intangible: false },
  { label: "Vehicles – Aircraft",                     group: "Vehicles",                     life: 20, method: "SLM", intangible: false },
  { label: "Intangible – Computer Software",          group: "Intangible Assets",            life: 3,  method: "SLM", intangible: true  },
  { label: "Intangible – Patents & Trade Marks",      group: "Intangible Assets",            life: 10, method: "SLM", intangible: true  },
  { label: "Intangible – Licences & Franchises",      group: "Intangible Assets",            life: 10, method: "SLM", intangible: true  },
] as const;

interface CaCategory {
  id: string; code: string; name: string; group: string | null;
  usefulLifeCompaniesAct: number; depreciationMethod: string;
  assetClassDescription: string | null; isIntangible: boolean;
  customFields: unknown; isActive: boolean;
}

type CaForm = { code: string; name: string; group: string; life: string; method: string; intangible: boolean; desc: string; customFieldsRaw: string };
const EMPTY: CaForm = { code: "", name: "", group: "", life: "5", method: "SLM", intangible: false, desc: "", customFieldsRaw: "[]" };

export function CategoriesClient() {
  const [items, setItems] = useState<CaCategory[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CaCategory | null>(null);
  const [form, setForm] = useState<CaForm>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CaCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const r = await fetch("/api/settings/categories");
    setItems(await r.json());
  }

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(c: CaCategory) {
    setEditing(c);
    setForm({ code: c.code, name: c.name, group: c.group ?? "", life: String(c.usefulLifeCompaniesAct), method: c.depreciationMethod, intangible: c.isIntangible, desc: c.assetClassDescription ?? "", customFieldsRaw: JSON.stringify(c.customFields ?? [], null, 2) });
    setOpen(true);
  }

  function applyPreset(label: string) {
    const p = CA_PRESETS.find(x => x.label === label);
    if (p) setForm(f => ({ ...f, group: p.group, life: String(p.life), method: p.method, intangible: p.intangible }));
  }

  async function save() {
    if (!form.code || !form.name) { toast.error("Code and Name are required"); return; }
    let cf: unknown = null;
    try { const p = JSON.parse(form.customFieldsRaw); cf = Array.isArray(p) ? p : null; } catch { toast.error("Custom fields JSON invalid"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editing ? { id: editing.id } : {}), code: form.code.toUpperCase(), name: form.name, group: form.group || null, usefulLifeCompaniesAct: Number(form.life), depreciationMethod: form.method, assetClassDescription: form.desc || null, isIntangible: form.intangible, customFields: cf }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  async function del() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/settings/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id }) });
      const d = await res.json();
      if (!res.ok) { setDeleteError(d.error ?? "Failed"); return; }
      toast.success("Category deleted");
      setDeleteTarget(null);
      load();
    } catch { setDeleteError("Network error — please try again"); }
    finally { setDeleting(false); }
  }

  const grouped = items.reduce<Record<string, CaCategory[]>>((a, c) => { const k = c.group ?? "— Ungrouped —"; (a[k] ??= []).push(c); return a; }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CA Categories</h1>
          <p className="text-sm text-gray-500">Schedule II, Companies Act 2013 · Straight Line Method (SLM) · {items.length} categories</p>
        </div>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />New Category
        </Button>
      </div>

      {Object.keys(grouped).sort().map(group => {
        const isCollapsed = collapsed[group];
        return (
          <div key={group} className="bg-white rounded-xl border overflow-hidden">
            <button onClick={() => setCollapsed(p => ({ ...p, [group]: !p[group] }))}
              className="w-full border-b px-4 py-2.5 flex items-center gap-2 bg-orange-50 hover:bg-orange-100 transition-colors">
              <span className="font-semibold text-sm text-gray-700 flex-1 text-left">{group}</span>
              <span className="text-xs text-gray-400 mr-2">({grouped[group].length})</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[550px]">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs">
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold">Name</th>
                      <th className="text-left px-4 py-2 text-gray-500 font-semibold">Code</th>
                      <th className="text-center px-4 py-2 text-gray-500 font-semibold">Useful Life</th>
                      <th className="text-center px-4 py-2 text-gray-500 font-semibold">Method</th>
                      <th className="text-center px-4 py-2 text-gray-500 font-semibold">Type</th>
                      <th className="px-4 py-2 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[group].map((cat, i) => (
                      <tr key={cat.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{cat.name}</td>
                        <td className="px-4 py-2.5"><span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{cat.code}</span></td>
                        <td className="px-4 py-2.5 text-center text-sm font-semibold text-orange-600">{cat.usefulLifeCompaniesAct} yrs</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.depreciationMethod === "SLM" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>{cat.depreciationMethod}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.isIntangible ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{cat.isIntangible ? "Intangible" : "Tangible"}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => { setDeleteTarget(cat); setDeleteError(null); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit CA Category" : "New CA Category"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. LAPT" className="font-mono" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Laptops & Notebooks" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Schedule II Preset</Label>
              <Select value="" onValueChange={(v: string | null) => { if (v) applyPreset(v); }}>
                <SelectTrigger><SelectDisplay value="" placeholder="Auto-fill from preset…" /></SelectTrigger>
                <SelectContent>{CA_PRESETS.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Auto-fills group, useful life, method and intangible flag</p>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>CA 2013 Group</Label>
              <Input value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="e.g. Computers & Data Processing" />
            </div>
            <div className="space-y-1.5">
              <Label>Useful Life (years) *</Label>
              <Input type="number" value={form.life} onChange={e => setForm(f => ({ ...f, life: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(v: string | null) => { if (v) setForm(f => ({ ...f, method: v })); }}>
                <SelectTrigger><SelectDisplay value={form.method}>{form.method === "SLM" ? "SLM – Straight Line" : "WDV – Written Down Value"}</SelectDisplay></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SLM">SLM – Straight Line Method</SelectItem>
                  <SelectItem value="WDV">WDV – Written Down Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="intangible" checked={form.intangible} onChange={e => setForm(f => ({ ...f, intangible: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
              <label htmlFor="intangible" className="text-sm text-gray-700">Intangible Asset (software, patents, licences, know-how)</label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Category-specific Fields (JSON array)</Label>
              <textarea value={form.customFieldsRaw} onChange={e => setForm(f => ({ ...f, customFieldsRaw: e.target.value }))} rows={4}
                className="w-full text-xs font-mono border rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder='[{"key":"chassisNo","label":"Chassis Number"}]' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={loading} className="bg-orange-500 hover:bg-orange-600">{loading ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={del}
        itemLabel={deleteTarget ? `${deleteTarget.name} (${deleteTarget.code})` : ""}
        entityType="Category"
        deleting={deleting}
        error={deleteError}
      />
    </div>
  );
}
