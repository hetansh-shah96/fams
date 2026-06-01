import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { DaysSelect } from "@/components/reports/days-select";

export default async function UtilizationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const days = Number(sp.days ?? 30);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const locationFilter = session!.user.role === "BRANCH_MANAGER" && session!.user.locationId
    ? { currentLocationId: session!.user.locationId } : {};

  const assets = await prisma.asset.findMany({
    where: {
      ...locationFilter,
      status: { in: ["IN_REPAIR", "IDLE"] },
      updatedAt: { lte: cutoff },
    },
    orderBy: { updatedAt: "asc" },
    include: {
      category: true,
      currentLocation: true,
      currentDepartment: true,
      assignedUser: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-orange-500" />Utilization Report
          </h1>
          <p className="text-sm text-gray-500">Assets in Repair/Idle for more than {days} days — {assets.length} found</p>
        </div>
        <DaysSelect days={days} basePath="/reports/utilization" />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Dept</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Assigned To</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Last Updated</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Days Idle</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No underutilised assets found</td></tr>
            ) : (
              assets.map((a, i) => (
                <tr key={a.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.name}</p>
                    <Link href={`/assets/${a.id}`} className="text-xs font-mono text-blue-700 hover:underline">{a.assetCode}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.category.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === "IN_REPAIR" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {a.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{a.currentLocation.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.currentDepartment.name}</td>
                  <td className="px-4 py-3 text-gray-500">{a.assignedUser?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(a.updatedAt), "dd MMM yyyy")}</td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    {differenceInDays(new Date(), new Date(a.updatedAt))}d
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
