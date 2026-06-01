import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default async function MaintenancePage() {
  const session = await auth();

  const logs = await prisma.maintenanceLog.findMany({
    orderBy: { serviceDate: "desc" },
    take: 50,
    include: {
      asset: {
        select: {
          assetCode: true,
          name: true,
          currentLocation: { select: { name: true } },
          currentDepartment: { select: { name: true } },
        },
      },
      createdBy: { select: { name: true } },
    },
  });

  const canWrite = session!.user.role !== "EMPLOYEE";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Logs</h1>
          <p className="text-sm text-gray-500">{logs.length} records</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Link href="/maintenance/renewals">
              <Button variant="outline" size="sm">Upcoming Renewals</Button>
            </Link>
            <Link href="/maintenance/new">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                <Plus className="w-4 h-4 mr-2" />Add Log
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Service Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Next Due</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Cost</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No maintenance logs</td></tr>
            ) : (
              logs.map((log, i) => (
                <tr key={log.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.asset.name}</p>
                    <p className="text-xs text-blue-700 font-mono">{log.asset.assetCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      {log.serviceType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.vendorName ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(log.serviceDate), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-xs">
                    {log.nextDueDate ? (
                      <span className={new Date(log.nextDueDate) < new Date() ? "text-red-600 font-semibold" : "text-gray-500"}>
                        {format(new Date(log.nextDueDate), "dd MMM yyyy")}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">₹{Number(log.cost).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-gray-500">{log.asset.currentLocation?.name ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
