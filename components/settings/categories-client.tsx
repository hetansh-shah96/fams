"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Building2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

// Companies Act 2013, Schedule II
export const CA_GROUPS = [
  { label: "Buildings – RCC Frame",              usefulLife: 60,  method: "SLM", isIntangible: false },
  { label: "Buildings – Other Structures",       usefulLife: 30,  method: "SLM", isIntangible: false },
  { label: "Buildings – Temporary Structures",   usefulLife: 3,   method: "SLM", isIntangible: false },
  { label: "Computers & Data Processing",        usefulLife: 3,   method: "SLM", isIntangible: false },
  { label: "Electrical Installations",           usefulLife: 10,  method: "SLM", isIntangible: false },
  { label: "Furniture & Fittings",               usefulLife: 10,  method: "SLM", isIntangible: false },
  { label: "Laboratory Equipment",               usefulLife: 10,  method: "SLM", isIntangible: false },
  { label: "Office Equipment",                   usefulLife: 5,   method: "SLM", isIntangible: false },
  { label: "Plant & Machinery – General",        usefulLife: 15,  method: "SLM", isIntangible: false },
  { label: "Plant & Machinery – Continuous",     usefulLife: 25,  method: "SLM", isIntangible: false },
  { label: "Vehicles – Motor",                   usefulLife: 8,   method: "WDV", isIntangible: false },
  { label: "Vehicles – Ships",                   usefulLife: 20,  method: "SLM", isIntangible: false },
  { label: "Vehicles – Aircraft",                usefulLife: 20,  method: "SLM", isIntangible: false },
  { label: "Intangible – Computer Software",     usefulLife: 3,   method: "SLM", isIntangible: true  },
  { label: "Intangible – Goodwill",              usefulLife: 10,  method: "SLM", isIntangible: true  },
  { label: "Intangible – Patents & Trade Marks", usefulLife: 10,  method: "SLM", isIntangible: true  },
  { label: "Intangible – Licences & Franchises", usefulLife: 10,  method: "SLM", isIntangible: true  },
  { label: "Intangible – Technical Know-how",    usefulLife: 10,  method: "SLM", isIntangible: true  },
] as const;

// Income Tax Act – Appendix I (IT Rules 1962) – Official depreciation rates
// Source: https://www.incometaxindia.gov.in/w/depreciation-rates
export const IT_BLOCKS = [
  { label: "5%  – Residential Buildings (other than hotels & boarding houses)",                                    rate: 0.05 },
  { label: "10% – Buildings (other than residential buildings)",                                                   rate: 0.10 },
  { label: "10% – Furniture & Fittings (including electrical fittings)",                                           rate: 0.10 },
  { label: "15% – Plant & Machinery (General)",                                                                    rate: 0.15 },
  { label: "15% – Motor Cars (not used in business of running on hire)",                                           rate: 0.15 },
  { label: "20% – Ocean-going Ships & Vessels",                                                                    rate: 0.20 },
  { label: "25% – Intangible Assets (Know-how, Patents, Copyrights, Trade Marks, Licences, Franchises, etc.)",    rate: 0.25 },
  { label: "30% – Motor taxis, lorries, motor buses used in business of running on hire",                          rate: 0.30 },
  { label: "40% – Computers including computer software",                                                          rate: 0.40 },
  { label: "40% – Aircraft",                                                                                       rate: 0.40 },
  { label: "60% – Books owned by a person carrying on a profession",                                               rate: 0.60 },
  { label: "100% – Purely temporary erections such as wooden structures",                                          rate: 1.00 },
] as const;

interface CustomField {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
}

interface Category {
  id: string;
  code: string;
  name: string;
  group: string | null;
  itActBlock: string | null;
  usefulLifeCompaniesAct: number;
  itActBlockRate: number;
  depreciationMethod: string;
  assetClassDescription: string | null;
  isIntangible: boolean;
  customFields: CustomField[] | null;
  isActive: boolean;
}

interface FormState {
  code: string;
  name: string;
  group: string;
  itActBlock: string;
  usefulLifeCompaniesAct: string;
  itActBlockRate: string;
  depreciationMethod: string;
  assetClassDescription: string;
  isIntangible: boolean;
  customFieldsRaw: string;
}

const EMPTY: FormState = {
  code: "", name: "", group: "", itActBlock: "",
  usefulLifeCompaniesAct: "5", itActBlockRate: "0.15",
  depreciationMethod: "SLM", assetClassDescription: "",
  isIntangible: false, customFieldsRaw: "[]",
};

export function CategoriesClient() {
  const [items, setItems] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"ca" | "it">("ca");

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/settings/categories");
    setItems(await res.json());
  }

  function setF<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function onGroupChange(groupLabel: string) {
    const g = CA_GROUPS.find(g => g.label === groupLabel);
    setForm(prev => ({
      ...prev,
      group: groupLabel,
      usefulLifeCompaniesAct: g ? String(g.usefulLife) : prev.usefulLifeCompaniesAct,
      depreciationMethod: g ? g.method : prev.depreciationMethod,
      isIntangible: g ? g.isIntangible : prev.isIntangible,
    }));
  }

  function onBlockChange(blockLabel: string) {
    const b = IT_BLOCKS.find(b => b.label === blockLabel);
    setForm(prev => ({
      ...prev,
      itActBlock: blockLabel,
      itActBlockRate: b ? String(b.rate) : prev.itActBlockRate,
    }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(item: Category) {
    setEditing(item);
    setForm({
      code: item.code,
      name: item.name,
      group: item.group ?? "",
      itActBlock: item.itActBlock ?? "",
      usefulLifeCompaniesAct: String(item.usefulLifeCompaniesAct),
      itActBlockRate: String(item.itActBlockRate),
      depreciationMethod: item.depreciationMethod,
      assetClassDescription: item.assetClassDescription ?? "",
      isIntangible: item.isIntangible,
      customFieldsRaw: JSON.stringify(item.customFields ?? [], null, 2),
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and Name are required");
      return;
    }
    let customFields: CustomField[] | null = null;
    try {
      const parsed = JSON.parse(form.customFieldsRaw);
      customFields = Array.isArray(parsed) ? parsed : null;
    } catch {
      toast.error("Custom fields JSON is invalid");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        code: form.code.toUpperCase(),
        name: form.name,
        group: form.group || null,
        itActBlock: form.itActBlock || null,
        usefulLifeCompaniesAct: Number(form.usefulLifeCompaniesAct),
        itActBlockRate: Number(form.itActBlockRate),
        depreciationMethod: form.depreciationMethod,
        assetClassDescription: form.assetClassDescription || null,
        isIntangible: form.isIntangible,
        customFields,
      };
      const res = await fetch("/api/settings/categories", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editing ? "Category updated" : "Category created");
      setOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Category deleted");
      setConfirmId(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setDeleting(false); }
  }

  function toggleGroup(key: string) {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // CA view: grouped by Companies Act group; IT view: grouped by IT Act block
  const grouped = items.reduce<Record<string, Category[]>>((acc, cat) => {
    const key = viewMode === "ca"
      ? (cat.group ?? "— Ungrouped —")
      : (cat.itActBlock ?? "— No IT Act Block Assigned —");
    (acc[key] ??= []).push(cat);
    return acc;
  }, {});
  const sortedGroups = Object.keys(grouped).sort();

  const rate = Number(form.itActBlockRate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Categories</h1>
          <p className="text-sm text-gray-500">
            {items.length} categories · grouped by{" "}
            {viewMode === "ca" ? "Companies Act 2013 Schedule II" : "Income Tax Act Block of Assets"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden text-xs font-medium">
            <button
              onClick={() => setViewMode("ca")}
              className={`px-3 py-1.5 transition-colors ${viewMode === "ca" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Companies Act
            </button>
            <button
              onClick={() => setViewMode("it")}
              className={`px-3 py-1.5 transition-colors ${viewMode === "it" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Income Tax Act
            </button>
          </div>
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />New Category
          </Button>
        </div>
      </div>

      {/* IT Act info banner */}
      {viewMode === "it" && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-800">
          <strong>Income Tax Act — Block of Assets (WDV Method).</strong> 180-day rule applies: if asset put to use on/after 3 Oct (less than 180 days remaining in FY), only 50% of the block rate is allowed.{" "}
          <a href="https://www.incometaxindia.gov.in/w/depreciation-rates" target="_blank" rel="noopener noreferrer" className="underline">
            Official IT Dept rates →
          </a>
        </div>
      )}

      {sortedGroups.map(group => {
        const isCollapsed = collapsedGroups[group];
        return (
          <div key={group} className="bg-white rounded-xl border overflow-hidden">
            <button
              onClick={() => toggleGroup(group)}
              className={`w-full border-b px-4 py-2.5 flex items-center gap-2 transition-colors ${viewMode === "it" ? "bg-blue-50 hover:bg-blue-100" : "bg-orange-50 hover:bg-orange-100"}`}
            >
              <Building2 className={`w-4 h-4 flex-shrink-0 ${viewMode === "it" ? "text-blue-500" : "text-orange-500"}`} />
              <span className="font-semibold text-sm text-gray-700 flex-1 text-left">{group}</span>
              <span className="text-xs text-gray-400 mr-2">({grouped[group].length})</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {!isCollapsed && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs">
                    <th className="text-left px-4 py-2 font-semibold text-gray-500">Name</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500">Code</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-500">IT Act Block</th>
                    <th className="text-center px-4 py-2 font-semibold text-gray-500">CA Life</th>
                    <th className="text-center px-4 py-2 font-semibold text-gray-500">IT Rate (Full / ½yr)</th>
                    <th className="text-center px-4 py-2 font-semibold text-gray-500">Method</th>
                    <th className="text-center px-4 py-2 font-semibold text-gray-500">Type</th>
                    <th className="px-4 py-2 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {grouped[group].map((cat, i) => (
                    <tr key={cat.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{cat.code}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">{cat.itActBlock ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center text-gray-700 text-xs">{cat.usefulLifeCompaniesAct} yrs</td>
                      <td className="px-4 py-2.5 text-center text-xs font-medium text-gray-700">
                        {(cat.itActBlockRate * 100).toFixed(0)}%
                        <span className="text-gray-400 font-normal"> / {(cat.itActBlockRate * 50).toFixed(0)}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cat.depreciationMethod === "SLM" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {cat.depreciationMethod}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cat.isIntangible ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                          {cat.isIntangible ? "Intangible" : "Tangible"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {confirmId === cat.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <Button variant="destructive" size="sm" className="h-6 text-xs px-2" disabled={deleting} onClick={() => handleDelete(cat.id)}>
                              {deleting ? "…" : "Yes"}
                            </Button>
                            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirmId(null)}>No</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setConfirmId(cat.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Asset Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={e => setF("code", e.target.value.toUpperCase())}
                placeholder="e.g. LAPT"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Laptops & Notebooks" />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Companies Act 2013 Group (Schedule II)</Label>
              <Select value={form.group} onValueChange={(v: string | null) => v && onGroupChange(v)}>
                <SelectTrigger><SelectDisplay value={form.group} placeholder="Select group…">{form.group || undefined}</SelectDisplay></SelectTrigger>
                <SelectContent>
                  {CA_GROUPS.map(g => <SelectItem key={g.label} value={g.label}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Auto-fills useful life, depreciation method and intangible flag</p>
            </div>

            <div className="space-y-1.5">
              <Label>Useful Life – Companies Act (years)</Label>
              <Input type="number" value={form.usefulLifeCompaniesAct} onChange={e => setF("usefulLifeCompaniesAct", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Depreciation Method</Label>
              <Select value={form.depreciationMethod} onValueChange={(v: string | null) => v && setF("depreciationMethod", v)}>
                <SelectTrigger><SelectDisplay value={form.depreciationMethod}>{form.depreciationMethod === "SLM" ? "SLM – Straight Line Method" : "WDV – Written Down Value"}</SelectDisplay></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SLM" label="SLM – Straight Line Method">SLM – Straight Line Method</SelectItem>
                  <SelectItem value="WDV" label="WDV – Written Down Value">WDV – Written Down Value</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Income Tax Act – Block of Assets</Label>
              <Select value={form.itActBlock} onValueChange={(v: string | null) => v && onBlockChange(v)}>
                <SelectTrigger><SelectDisplay value={form.itActBlock} placeholder="Select IT Act block…">{form.itActBlock || undefined}</SelectDisplay></SelectTrigger>
                <SelectContent>
                  {IT_BLOCKS.map(b => <SelectItem key={b.label} value={b.label}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Auto-fills IT Act depreciation rate. WDV method; 50% rate if put to use after 3 Oct (less than 180 days in FY).</p>
            </div>

            <div className="space-y-1.5">
              <Label>IT Act Rate (decimal, e.g. 0.40)</Label>
              <Input type="number" step="0.01" value={form.itActBlockRate} onChange={e => setF("itActBlockRate", e.target.value)} />
              {rate > 0 && (
                <p className="text-xs text-blue-600">
                  Full year: {(rate * 100).toFixed(0)}% · First half (Apr–Sep): {(rate * 100).toFixed(0)}% · Second half (Oct–Mar): {(rate * 50).toFixed(0)}%
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Is Intangible Asset</Label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isIntangible"
                  checked={form.isIntangible}
                  onChange={e => setF("isIntangible", e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <label htmlFor="isIntangible" className="text-sm text-gray-700">
                  Intangible (software, patents, goodwill, licences, know-how)
                </label>
              </div>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Class Description</Label>
              <Input value={form.assetClassDescription} onChange={e => setF("assetClassDescription", e.target.value)} placeholder="e.g. Computing & IT Equipment" />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Category-specific Fields (JSON)</Label>
              <p className="text-xs text-gray-400">
                Define extra fields shown only for this category. Example: chassis no. for automobiles.
              </p>
              <textarea
                value={form.customFieldsRaw}
                onChange={e => setF("customFieldsRaw", e.target.value)}
                rows={5}
                className="w-full text-xs font-mono border rounded-md p-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder={'[{"key":"chassisNo","label":"Chassis Number"},{"key":"registrationNo","label":"Registration Number"}]'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Saving…" : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
