"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Select, SelectContent, SelectDisplay, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Filter, X } from "lucide-react";

interface FilterOption { id: string; name: string; }
interface ItActBlockOption { id: string; name: string; code: string; }

interface Props {
  itActBlocks: ItActBlockOption[];
  locations: FilterOption[];
  suppliers?: FilterOption[];
  users?: FilterOption[];
  statuses?: string[];
  current: {
    itActBlockId?: string;
    locationId?: string;
    supplierId?: string;
    userId?: string;
    status?: string;
  };
}

export function ReportFilters({ itActBlocks, locations, suppliers, users, statuses, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    ["itActBlockId", "locationId", "supplierId", "userId", "status"].forEach(k => params.delete(k));
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = !!(current.itActBlockId || current.locationId || current.supplierId || current.userId || current.status);

  return (
    <div className="bg-white border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mr-1">
          <Filter className="w-3.5 h-3.5" />Filters:
        </span>

        {/* IT Act Block */}
        <Select value={current.itActBlockId ?? ""} onValueChange={(v: string | null) => update("itActBlockId", v ?? "")}>
          <SelectTrigger className="h-7 text-xs w-52">
            <SelectDisplay value={current.itActBlockId ?? ""} placeholder="All IT Act Blocks">
              {current.itActBlockId ? itActBlocks.find(b => b.id === current.itActBlockId)?.name : undefined}
            </SelectDisplay>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All IT Act Blocks</SelectItem>
            {itActBlocks.map(b => <SelectItem key={b.id} value={b.id}>{b.code} — {b.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Location */}
        <Select value={current.locationId ?? ""} onValueChange={(v: string | null) => update("locationId", v ?? "")}>
          <SelectTrigger className="h-7 text-xs w-40">
            <SelectDisplay value={current.locationId ?? ""} placeholder="All Locations">
              {current.locationId ? locations.find(l => l.id === current.locationId)?.name : undefined}
            </SelectDisplay>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Locations</SelectItem>
            {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Supplier */}
        {suppliers && (
          <Select value={current.supplierId ?? ""} onValueChange={(v: string | null) => update("supplierId", v ?? "")}>
            <SelectTrigger className="h-7 text-xs w-44">
              <SelectDisplay value={current.supplierId ?? ""} placeholder="All Suppliers">
                {current.supplierId ? suppliers.find(s => s.id === current.supplierId)?.name : undefined}
              </SelectDisplay>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Suppliers</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Assigned user */}
        {users && (
          <Select value={current.userId ?? ""} onValueChange={(v: string | null) => update("userId", v ?? "")}>
            <SelectTrigger className="h-7 text-xs w-44">
              <SelectDisplay value={current.userId ?? ""} placeholder="All Users">
                {current.userId ? users.find(u => u.id === current.userId)?.name : undefined}
              </SelectDisplay>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Users</SelectItem>
              {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {/* Status */}
        {statuses && (
          <Select value={current.status ?? ""} onValueChange={(v: string | null) => update("status", v ?? "")}>
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectDisplay value={current.status ?? ""} placeholder="All Statuses">
                {current.status?.replace(/_/g, " ")}
              </SelectDisplay>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <button onClick={clear} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 ml-1">
            <X className="w-3 h-3" />Clear
          </button>
        )}
      </div>
    </div>
  );
}
