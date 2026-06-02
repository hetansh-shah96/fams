"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, MapPin, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface Branch {
  id: string; code: string; name: string;
  address?: string; city?: string; state?: string; pincode?: string;
  companyId?: string;
}

interface Company {
  id?: string; code: string; name: string;
  address1?: string; address2?: string; email?: string;
  city?: string; state?: string; country?: string;
  pincode?: string; phoneNo?: string; panNo?: string; gstNo?: string;
  isActive?: boolean;
  locations?: Branch[];
}

const EMPTY_CO: Company = { code: "", name: "", address1: "", address2: "", email: "", city: "", state: "", country: "India", pincode: "", phoneNo: "", panNo: "", gstNo: "" };
const EMPTY_BR = { code: "", name: "", address: "", city: "", state: "", pincode: "" };

export function CompanyClient() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [openCo, setOpenCo] = useState(false);
  const [editCo, setEditCo] = useState<Company | null>(null);
  const [formCo, setFormCo] = useState<Company>(EMPTY_CO);
  const [openBr, setOpenBr] = useState(false);
  const [editBr, setEditBr] = useState<Branch | null>(null);
  const [formBr, setFormBr] = useState(EMPTY_BR);
  const [activeBrCompanyId, setActiveBrCompanyId] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [confirmBrId, setConfirmBrId] = useState<string | null>(null);
  const [confirmCoId, setConfirmCoId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const res = await fetch("/api/settings/company");
    if (!res.ok) return;
    const cos: Company[] = await res.json();
    // Fetch branches for each company
    const locRes = await fetch("/api/settings/locations");
    const locs: (Branch & { companyId?: string })[] = locRes.ok ? await locRes.json() : [];
    setCompanies(cos.map(c => ({ ...c, locations: locs.filter(l => l.companyId === c.id) })));
  }

  // ── Company handlers ──────────────────────────────────────────────────────
  function openCreateCo() { setEditCo(null); setFormCo(EMPTY_CO); setOpenCo(true); }
  function openEditCo(c: Company) { setEditCo(c); setFormCo(c); setOpenCo(true); }

  async function saveCo() {
    if (!formCo.code || !formCo.name) { toast.error("Code and Name are required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCo ? { ...formCo, id: editCo.id } : formCo),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editCo ? "Company updated" : "Company created");
      setOpenCo(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  // ── Branch handlers ────────────────────────────────────────────────────────
  function openCreateBr(companyId: string) {
    setActiveBrCompanyId(companyId);
    setEditBr(null); setFormBr(EMPTY_BR); setOpenBr(true);
  }
  function openEditBr(br: Branch) {
    setActiveBrCompanyId(br.companyId ?? "");
    setEditBr(br);
    setFormBr({ code: br.code, name: br.name, address: br.address ?? "", city: br.city ?? "", state: br.state ?? "", pincode: br.pincode ?? "" });
    setOpenBr(true);
  }

  async function deleteBranch(id: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Branch deleted");
      setConfirmBrId(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setDeleting(false); }
  }

  async function deleteCompany(id: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Company deleted");
      setConfirmCoId(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setDeleting(false); }
  }

  async function saveBr() {
    if (!formBr.code || !formBr.name) { toast.error("Code and Name are required"); return; }
    setLoading(true);
    try {
      const payload = {
        ...(editBr ? { id: editBr.id } : {}),
        ...formBr,
        code: formBr.code.toUpperCase(),
        companyId: activeBrCompanyId || null,
      };
      const res = await fetch("/api/settings/locations", {
        method: editBr ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      toast.success(editBr ? "Branch updated" : "Branch created");
      setOpenBr(false);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  const coFields: { key: keyof Company; label: string; span?: boolean }[] = [
    { key: "code", label: "Company Code *" },
    { key: "name", label: "Company Name *", span: true },
    { key: "address1", label: "Registered Address", span: true },
    { key: "address2", label: "Address Line 2", span: true },
    { key: "email", label: "Email" },
    { key: "phoneNo", label: "Phone No" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "country", label: "Country" },
    { key: "pincode", label: "Pincode" },
    { key: "panNo", label: "PAN No" },
    { key: "gstNo", label: "GST No" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-500" />Companies &amp; Branches
          </h1>
          <p className="text-sm text-gray-500">Manage your company or group of companies and their branch locations.</p>
        </div>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={openCreateCo}>
          <Plus className="w-4 h-4 mr-2" />Add Company
        </Button>
      </div>

      {/* Company list */}
      {companies.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed p-16 text-center text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No companies yet</p>
          <p className="text-sm mt-1">Add your first company to get started</p>
        </div>
      )}

      {companies.map(co => {
        const isOpen = expanded[co.id ?? ""];
        const branches = co.locations ?? [];
        return (
          <div key={co.id} className="bg-white rounded-xl border overflow-hidden">
            {/* Company header */}
            <div className="px-5 py-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{co.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{co.code}</span>
                    {co.panNo && <span className="text-xs text-gray-400">PAN: {co.panNo}</span>}
                    {co.gstNo && <span className="text-xs text-gray-400">GST: {co.gstNo}</span>}
                  </div>
                  {(co.city || co.state) && (
                    <p className="text-xs text-gray-400 mt-0.5">{[co.city, co.state].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {confirmCoId === co.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Delete company?</span>
                    <Button variant="destructive" size="sm" className="h-6 text-xs px-2" disabled={deleting} onClick={() => deleteCompany(co.id!)}>
                      {deleting ? "…" : "Yes"}
                    </Button>
                    <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirmCoId(null)}>No</Button>
                  </div>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => openEditCo(co)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setConfirmCoId(co.id!)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setExpanded(p => ({ ...p, [co.id ?? ""]: !p[co.id ?? ""] }))}
                  className="flex items-center gap-1 text-xs text-gray-500"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {branches.length} {branches.length === 1 ? "branch" : "branches"}
                  {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Branches section */}
            {isOpen && (
              <div className="border-t bg-gray-50">
                <div className="flex items-center justify-between px-5 py-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Branch Locations</p>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openCreateBr(co.id ?? "")}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Add Branch
                  </Button>
                </div>
                {branches.length === 0 ? (
                  <p className="px-5 pb-4 text-sm text-gray-400">No branches yet — click Add Branch above.</p>
                ) : (
                  <div className="px-5 pb-4 space-y-2">
                    {branches.map(br => (
                      <div key={br.id} className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm text-gray-900">{br.name}</p>
                            <p className="text-xs text-gray-500">
                              <span className="font-mono bg-gray-100 px-1 rounded mr-2">{br.code}</span>
                              {[br.address, br.city, br.state, br.pincode].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                        {confirmBrId === br.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <Button variant="destructive" size="sm" className="h-6 text-xs px-2" disabled={deleting} onClick={() => deleteBranch(br.id)}>
                              {deleting ? "…" : "Yes"}
                            </Button>
                            <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => setConfirmBrId(null)}>No</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditBr({ ...br, companyId: co.id })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setConfirmBrId(br.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Company dialog */}
      <Dialog open={openCo} onOpenChange={setOpenCo}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCo ? "Edit Company" : "Add New Company"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {coFields.map(f => (
              <div key={String(f.key)} className={`space-y-1.5 ${f.span ? "col-span-2" : ""}`}>
                <Label>{f.label}</Label>
                <Input
                  value={String(formCo[f.key] ?? "")}
                  onChange={e => setFormCo(p => ({ ...p, [f.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCo(false)}>Cancel</Button>
            <Button onClick={saveCo} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Saving…" : "Save Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch dialog */}
      <Dialog open={openBr} onOpenChange={setOpenBr}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editBr ? "Edit Branch" : "Add Branch"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Branch Code *</Label>
              <Input
                value={formBr.code}
                onChange={e => setFormBr(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. MUM-HO"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Branch Name *</Label>
              <Input
                value={formBr.name}
                onChange={e => setFormBr(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Mumbai Head Office"
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Address</Label>
              <Input value={formBr.address} onChange={e => setFormBr(p => ({ ...p, address: e.target.value }))} placeholder="Street / Building" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={formBr.city} onChange={e => setFormBr(p => ({ ...p, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input value={formBr.state} onChange={e => setFormBr(p => ({ ...p, state: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Pincode</Label>
              <Input value={formBr.pincode} onChange={e => setFormBr(p => ({ ...p, pincode: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBr(false)}>Cancel</Button>
            <Button onClick={saveBr} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
              {loading ? "Saving…" : "Save Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
