"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Transfer {
  id: string;
  transferDate: string;
  status: string;
  notes: string | null;
  asset: { assetCode: string; name: string };
  fromLocation: { name: string } | null;
  toLocation: { name: string };
  toDepartment: { name: string };
  toUser: { name: string } | null;
  transferredBy: { name: string };
}

interface Props {
  items: Transfer[];
  total: number;
  page: number;
  pageSize: number;
  role: string;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
};

export function TransferListClient({ items, total, page, pageSize, role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.ceil(total / pageSize);

  function setPage(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfers</h1>
          <p className="text-sm text-gray-500">{total} total transfers</p>
        </div>
        {role !== "EMPLOYEE" && (
          <Link href="/transfers/new">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />New Transfer
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">From</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">To</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Assigned To</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">By</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No transfers found</td></tr>
            ) : (
              items.map((item, i) => (
                <tr key={item.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.asset.name}</p>
                    <p className="text-xs text-blue-700 font-mono">{item.asset.assetCode}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.fromLocation?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-700">{item.toLocation.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.toDepartment.name}</td>
                  <td className="px-4 py-3 text-gray-600">{item.toUser?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(item.transferDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[item.status] ?? ""}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.transferredBy.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
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
    </div>
  );
}
