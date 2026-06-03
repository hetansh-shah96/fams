"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Info } from "lucide-react";

// ── Companies Act 2013 Schedule II preset groups ──────────────────────────────
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

interface ItBlock {
  id: string; code: string; name: string; rate: number;
  description: string | null; isActive: boolean;
}

// ── CA Category form ──────────────────────────────────────────────────────────
type CaForm = { code: string; name: string; group: string; life: string; method: string; intangible: boolean; desc: string; customFieldsRaw: string };
const CA_EMPTY: CaForm = { code: "", name: "", group: "", life: "5", method: "SLM", intangible: false, desc: "", customFieldsRaw: "[]" };

// ── IT Block form ─────────────────────────────────────────────────────────────
type ItForm = { code: string; name: string; rate: string; desc: string };
const IT_EMPTY: ItForm = { code: "", name: "", rate: "0.15", desc: "" };

export function CategoriesClient() {
  const [caItems, setCaItems] = useState<CaCategory[]>([]);
  const [itItems, setItItems] = useState<ItBlock[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // CA dialog state
  const [caOpen, setCaOpen] = useState(false);
  const [caEditing, setCaEditing] = useState<CaCategory | null>(null);
  const [caForm, setCaForm] = useState<CaForm>(CA_EMPTY);
  const [caLoading, setCaLoading] = useState(false);
  const [caConfirm, setCaConfirm] = useState<string | null>(null);

  // IT dialog state
  const [itOpen, setItOpen] = useState(false);
  const [itEditing, setItEditing] = useState<ItBlock | null>(null);
  const [itForm, setItForm] = useState<ItForm>(IT_EMPTY);
  const [itLoading, setItLoading] = useState(false);
  const [itConfirm, setItConfirm] = useState<string | null>(null);

  useEffect(() => { loadCa(); loadIt(); }, []);

  async function loadCa() {
    const r = await fetch("/api/settings/categories");
    setCaItems(await r.json());
  }
  async function loadIt() {
    const r = await fetch("/api/settings/it-act-blocks");
    setItItems(await r.json());
  }

  // ── CA handlers ──────────────────────────────────────────────────────────────
  function openCaCreate() { setCaEditing(null); setCaForm(CA_EMPTY); setCaOpen(true); }
  function openCaEdit(c: CaCategory) {
    setCaEditing(c);
    setCaForm({ code: c.code, name: c.name, group: c.group ?? "", life: String(c.usefulLifeCompaniesAct), method: c.depreciationMethod, intangible: c.isIntangible, desc: c.assetClassDescription ?? "", customFieldsRaw: JSON.stringify(c.customFields ?? [], null, 2) });
    setCaOpen(true);
  }
  function applyCaPreset(label: string) {
    const p = CA_PRESETS.find(x => x.label === label);
    if (p) setCaForm(f => ({ ...f, group: p.group, life: String(p.life), method: p.method, intangible: p.intangible }));
  }
  async function saveCa() {
    if (!caForm.code || !caForm.name) { toast.error("Code and Name required"); return; }
    let cf: unknown = null;
    try { const p = JSON.parse(caForm.customFieldsRaw); cf = Array.isArray(p) ? p : null; } catch { toast.error("Custom fields JSON invalid"); return; }
    setCaLoading(true);
    try {
      const res = await fetch("/api/settings/categories", {
        method: caEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(caEditing ? { id: caEditing.id } : {}), code: caForm.code.toUpperCase(), name: caForm.name, group: caForm.group || null, usefulLifeCompaniesAct: Number(caForm.life), depreciationMethod: caForm.method, assetClassDescription: caForm.desc || null, isIntangible: caForm.intangible, customFields: cf }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(caEditing ? "Category updated" : "Category created");
      setCaOpen(false); loadCa();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setCaLoading(false); }
  }
  async function deleteCa(id: string) {
    try {
      const res = await fetch("/api/settings/categories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast.success("Deleted"); setCaConfirm(null); loadCa();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
  }

  // ── IT handlers ──────────────────────────────────────────────────────────────
  function openItCreate() { setItEditing(null); setItForm(IT_EMPTY); setItOpen(true); }
  function openItEdit(b: ItBlock) {
    setItEditing(b);
    setItForm({ code: b.code, name: b.name, rate: String(b.rate), desc: b.description ?? "" });
    setItOpen(true);
  }
  async function saveIt() {
    if (!itForm.code || !itForm.name || !itForm.rate) { toast.error("Code, Name and Rate required"); return; }
    setItLoading(true);
    try {
      const res = await fetch("/api/settings/it-act-blocks", {
        method: itEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(itEditing ? { id: itEditing.id } : {}), code: itForm.code.toUpperCase(), name: itForm.name, rate: Number(itForm.rate), description: itForm.desc || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(itEditing ? "Block updated" : "Block created");
      setItOpen(false); loadIt();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setItLoading(false); }
  }
  async function deleteIt(id: string) {
    try {
      const res = await fetch("/api/settings/it-act-blocks", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast.success("Deleted"); setItConfirm(null); loadIt();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
  }

  // ── CA grouped view ───────────────────────────────────────────────────────────
  const caGrouped = caItems.reduce<Record<string, CaCategory[]>>((a, c) => { const k = c.group ?? "— Ungrouped —"; (a[k] ??= []).push(c); return a; }, {});

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Asset Categories</h1>

      <Tabs defaultValue="ca">
        <TabsList variant="line" className="mb-2">
          <TabsTrigger value="ca" className="px-5 py-2.5 text-sm">
            Companies Act 2013
            <span className="ml-2 text-xs text-gray-400">({caItems.length})</span>
          </TabsTrigger>
          <TabsTrigger value="it" className="px-5 py-2.5 text-sm">
            Income Tax Act — Blocks
            <span className="ml-2 text-xs text-gray-400">({itItems.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── COMPANIES ACT TAB ─────────────────────────────────────────────── */}
        <TabsContent value="ca">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Grouped by Schedule II, Companies Act 2013 — Straight Line Method (SLM) · Useful life in years</p>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openCaCreate}>
                <Plus className="w-4 h-4 mr-2" />New Category
              </Button>
            </div>

            {Object.keys(caGrouped).sort().map(group => {
              const isCollapsed = collapsed[group];
              return (
                <div key={group} className="bg-white rounded-xl border overflow-hidden">
                  <button onClick={() => setCollapsed(p => ({ ...p, [group]: !p[group] }))}
                    className="w-full border-b px-4 py-2.5 flex items-center gap-2 bg-orange-50 hover:bg-orange-100 transition-colors">
                    <span className="font-semibold text-sm text-gray-700 flex-1 text-left">{group}</span>
                    <span className="text-xs text-gray-400 mr-2">({caGrouped[group].length})</span>
                    {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
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
                          {caGrouped[group].map((cat, i) => (
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
                                {caConfirm === cat.id ? (
                                  <div className="flex gap-1"><span className="text-xs text-gray-500">Delete?</span>
                                    <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => deleteCa(cat.id)}>Yes</Button>
                                    <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setCaConfirm(null)}>No</Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openCaEdit(cat)}><Pencil className="w-3.5 h-3.5" /></Button>
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => setCaConfirm(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                  </div>
                                )}
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
          </div>
        </TabsContent>

        {/* ── INCOME TAX ACT TAB ────────────────────────────────────────────── */}
        <TabsContent value="it">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Block of Assets — Appendix I, IT Rules 1962 · Written Down Value (WDV) method</p>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openItCreate}>
                <Plus className="w-4 h-4 mr-2" />New Block
              </Button>
            </div>

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Block of Assets (WDV Method).</strong> All assets with the same rate form one block. Depreciation = Opening WDV × Rate.{" "}
                <strong>180-day rule:</strong> if asset put to use on/after 3 Oct (less than 180 days), only 50% of the rate is allowed for that year.
                Rates set by Appendix I, Income Tax Rules 1962.
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
                    {itItems.map((b, i) => (
                      <tr key={b.id} className={`border-b last:border-0 hover:bg-blue-50 ${i % 2 === 1 ? "bg-blue-50/30" : ""}`}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{b.name}</td>
                        <td className="px-4 py-3"><span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{b.code}</span></td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-lg font-bold text-blue-700">{(b.rate * 100).toFixed(0)}%</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-blue-500">{(b.rate * 50).toFixed(0)}%</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">{b.description ?? "—"}</td>
                        <td className="px-4 py-3">
                          {itConfirm === b.id ? (
                            <div className="flex gap-1"><span className="text-xs text-gray-500">Delete?</span>
                              <Button variant="destructive" size="sm" className="h-6 text-xs px-2" onClick={() => deleteIt(b.id)}>Yes</Button>
                              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setItConfirm(null)}>No</Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openItEdit(b)}><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600" onClick={() => setItConfirm(b.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── CA Dialog ────────────────────────────────────────────────────────── */}
      <Dialog open={caOpen} onOpenChange={setCaOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{caEditing ? "Edit CA Category" : "New CA Category"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={caForm.code} onChange={e => setCaForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. LAPT" className="font-mono" disabled={!!caEditing} />
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={caForm.name} onChange={e => setCaForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Laptops & Notebooks" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Schedule II Preset</Label>
              <Select value="" onValueChange={(v: string | null) => { if (v) applyCaPreset(v); }}>
                <SelectTrigger><SelectDisplay value="" placeholder="Auto-fill from Schedule II preset…" /></SelectTrigger>
                <SelectContent>{CA_PRESETS.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Auto-fills group, useful life, method, and intangible flag</p>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>CA 2013 Group</Label>
              <Input value={caForm.group} onChange={e => setCaForm(f => ({ ...f, group: e.target.value }))} placeholder="e.g. Computers & Data Processing" />
            </div>
            <div className="space-y-1.5">
              <Label>Useful Life (years) *</Label>
              <Input type="number" value={caForm.life} onChange={e => setCaForm(f => ({ ...f, life: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Depreciation Method</Label>
              <Select value={caForm.method} onValueChange={(v: string | null) => { if (v) setCaForm(f => ({ ...f, method: v })); }}>
                <SelectTrigger><SelectDisplay value={caForm.method}>{caForm.method === "SLM" ? "SLM – Straight Line" : "WDV – Written Down Value"}</SelectDisplay></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SLM">SLM – Straight Line Method</SelectItem>
                  <SelectItem value="WDV">WDV – Written Down Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="intangible" checked={caForm.intangible} onChange={e => setCaForm(f => ({ ...f, intangible: e.target.checked }))} className="w-4 h-4 accent-orange-500" />
              <label htmlFor="intangible" className="text-sm text-gray-700">Intangible Asset (software, patents, licences, know-how)</label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Input value={caForm.desc} onChange={e => setCaForm(f => ({ ...f, desc: e.target.value }))} placeholder="Brief description of this asset class" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Category-specific Fields (JSON array)</Label>
              <textarea value={caForm.customFieldsRaw} onChange={e => setCaForm(f => ({ ...f, customFieldsRaw: e.target.value }))} rows={4}
                className="w-full text-xs font-mono border rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder='[{"key":"chassisNo","label":"Chassis Number"},{"key":"registrationNo","label":"Reg. No."}]' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaOpen(false)}>Cancel</Button>
            <Button onClick={saveCa} disabled={caLoading} className="bg-orange-500 hover:bg-orange-600">{caLoading ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── IT Block Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={itOpen} onOpenChange={setItOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{itEditing ? "Edit IT Act Block" : "New IT Act Block"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input value={itForm.code} onChange={e => setItForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. BLOCK-15A" className="font-mono" disabled={!!itEditing} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate (e.g. 0.15 = 15%) *</Label>
              <Input type="number" step="0.01" min="0" max="1" value={itForm.rate} onChange={e => setItForm(f => ({ ...f, rate: e.target.value }))} />
              {Number(itForm.rate) > 0 && (
                <p className="text-xs text-blue-600">Full year: {(Number(itForm.rate) * 100).toFixed(0)}% · ½ year: {(Number(itForm.rate) * 50).toFixed(0)}%</p>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Block Name *</Label>
              <Input value={itForm.name} onChange={e => setItForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 15% — Plant & Machinery (General)" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Description</Label>
              <Input value={itForm.desc} onChange={e => setItForm(f => ({ ...f, desc: e.target.value }))} placeholder="Assets covered under this block" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItOpen(false)}>Cancel</Button>
            <Button onClick={saveIt} disabled={itLoading} className="bg-blue-600 hover:bg-blue-700">{itLoading ? "Saving…" : "Save Block"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
