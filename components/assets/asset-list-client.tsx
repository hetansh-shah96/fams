"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Download, QrCode, ChevronLeft, ChevronRight, Tag, ArrowRightLeft, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  PROCURED: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-cyan-100 text-cyan-700",
  ACTIVE: "bg-green-100 text-green-700",
  IN_REPAIR: "bg-orange-100 text-orange-700",
  IDLE: "bg-yellow-100 text-yellow-700",
  RETIRED: "bg-gray-100 text-gray-600",
  DISPOSED: "bg-red-100 text-red-700",
};

interface Asset {
  id: string;
  assetCode: string;
  name: string;
  make: string | null;
  model: string | null;
  serialNumber: string | null;
  status: string;
  condition: string | null;
  assetTagNumber: string | null;
  purchaseDate: string;
  purchaseCost: string;
  warrantyExpiry: string | null;
  category: { name: string };
  currentLocation: { name: string };
  currentDepartment: { name: string };
  assignedUser: { name: string } | null;
}

interface Props {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
  itActBlocks: { id: string; name: string; code: string }[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  role: string;
}

export function AssetListClient({ assets, total, page, pageSize, itActBlocks, locations, departments, role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<"transfer" | "status" | null>(null);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === assets.length ? new Set() : new Set(assets.map((a) => a.id))));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function setPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const totalPages = Math.ceil(total / pageSize);
  const canWrite = role === "SUPER_ADMIN" || role === "BRANCH_MANAGER";

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-sm text-gray-500">{total} total assets</p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Link href="/assets/qr-scanner">
              <Button variant="outline" size="sm">
                <QrCode className="w-4 h-4 mr-2" />
                Scanner
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Link href="/assets/new">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search name, code, serial..."
            defaultValue={sp.get("search") ?? ""}
            className="pl-9"
            onChange={(e) => updateParam("search", e.target.value)}
          />
        </div>
        <Select defaultValue={sp.get("status") ?? ""} onValueChange={(v: string | null) => updateParam("status", (v ?? "ALL") === "ALL" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {["IN_TRANSIT","ACTIVE","IN_REPAIR","IDLE","RETIRED","DISPOSED"].map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select defaultValue={sp.get("itActBlockId") ?? ""} onValueChange={(v: string | null) => updateParam("itActBlockId", (v ?? "ALL") === "ALL" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="IT Act Block" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All IT Act Blocks</SelectItem>
            {itActBlocks.map((b) => (
              <SelectItem key={b.id} value={b.id} label={b.name}>{b.code} — {b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {role === "SUPER_ADMIN" && (
          <Select defaultValue={sp.get("locationId") ?? ""} onValueChange={(v: string | null) => updateParam("locationId", (v ?? "ALL") === "ALL" ? "" : (v ?? ""))}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id} label={l.name}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                {canWrite && (
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={assets.length > 0 && selected.size === assets.length}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Serial No</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Cost (₹)</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">QR Tag</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={canWrite ? 12 : 11} className="text-center py-12 text-gray-400">No assets found</td>
                </tr>
              ) : (
                assets.map((asset, i) => (
                  <tr
                    key={asset.id}
                    className={`border-b last:border-0 hover:bg-orange-50 transition-colors ${selected.has(asset.id) ? "bg-orange-50" : i % 2 === 1 ? "bg-amber-50/30" : ""}`}
                  >
                    {canWrite && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(asset.id)}
                          onChange={() => toggleOne(asset.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 font-semibold">{asset.assetCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{asset.name}</p>
                      {asset.make && <p className="text-xs text-gray-400">{asset.make} {asset.model}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{asset.category.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{asset.serialNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.currentLocation.name}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.currentDepartment.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[asset.status] ?? ""}`}>
                        {asset.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {format(new Date(asset.purchaseDate), "dd-MMM-yyyy")}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      ₹{Number(asset.purchaseCost).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      {asset.assetTagNumber ? (
                        <Link href={`/assets/${asset.id}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600">
                          <QrCode className="w-3.5 h-3.5" />
                          <span className="font-mono truncate max-w-24">{asset.assetTagNumber}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300 flex items-center gap-1"><Tag className="w-3.5 h-3.5" />—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/assets/${asset.id}`} className="text-orange-600 hover:underline text-xs font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-gray-900 text-white rounded-xl shadow-xl px-5 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" className="bg-transparent border-gray-600 text-white hover:bg-gray-800" onClick={() => setBulkModal("transfer")}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />Bulk Transfer
          </Button>
          <Button size="sm" variant="outline" className="bg-transparent border-gray-600 text-white hover:bg-gray-800" onClick={() => setBulkModal("status")}>
            <RefreshCw className="w-4 h-4 mr-2" />Update Status
          </Button>
          <button onClick={clearSelection} className="text-gray-400 hover:text-white" aria-label="Clear selection">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {bulkModal === "transfer" && (
        <BulkTransferModal
          assetIds={[...selected]}
          locations={locations}
          departments={departments}
          onClose={() => setBulkModal(null)}
          onSuccess={() => { setBulkModal(null); clearSelection(); router.refresh(); }}
        />
      )}

      {bulkModal === "status" && (
        <BulkStatusModal
          assetIds={[...selected]}
          onClose={() => setBulkModal(null)}
          onSuccess={() => { setBulkModal(null); clearSelection(); router.refresh(); }}
        />
      )}
    </div>
  );
}

const BULK_STATUSES = ["IN_TRANSIT", "ACTIVE", "IN_REPAIR", "IDLE", "RETIRED"] as const;

function BulkTransferModal({ assetIds, locations, departments, onClose, onSuccess }: {
  assetIds: string[];
  locations: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [toLocationId, setToLocationId] = useState("");
  const [toDepartmentId, setToDepartmentId] = useState("");
  const [transferDate, setTransferDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toLocationId || !toDepartmentId) {
      setError("Location and department are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/assets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TRANSFER", assetIds, toLocationId, toDepartmentId, transferDate, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to transfer assets");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Bulk Transfer</h2>
        <p className="text-sm text-gray-500 mb-4">Transferring {assetIds.length} asset{assetIds.length === 1 ? "" : "s"}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Location</label>
            <select value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select location</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Department</label>
            <select value={toDepartmentId} onChange={(e) => setToDepartmentId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required>
              <option value="">Select department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Date</label>
            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes" className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
              {loading ? "Processing…" : "Confirm Transfer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkStatusModal({ assetIds, onClose, onSuccess }: {
  assetIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<string>("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/assets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "STATUS_UPDATE", assetIds, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to update status");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Bulk Status Update</h2>
        <p className="text-sm text-gray-500 mb-4">Updating {assetIds.length} asset{assetIds.length === 1 ? "" : "s"} (disposed assets are skipped)</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" required>
              {BULK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" disabled={loading}>
              {loading ? "Processing…" : "Confirm Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
