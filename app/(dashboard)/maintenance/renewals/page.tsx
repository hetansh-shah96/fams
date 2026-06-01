import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addDays } from "date-fns";
import { format, differenceInDays } from "date-fns";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const SERVICE_LABELS: Record<string, string> = {
  AMC_VISIT: "AMC Visit",
  BREAKDOWN_REPAIR: "Breakdown Repair",
  SCHEDULED_SERVICE: "Scheduled Service",
  INSURANCE_RENEWAL: "Insurance Renewal",
  PUC_RENEWAL: "PUC Renewal",
  WARRANTY_CLAIM: "Warranty Claim",
  OTHER: "Other",
};

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; type?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const days = Number(sp.days ?? 30);
  const type = sp.type ?? "";

  const where: Record<string, unknown> = {
    nextDueDate: { lte: addDays(new Date(), days), gte: new Date() },
  };
  if (type) where.serviceType = type;
  if (session!.user.role === "BRANCH_MANAGER" && session!.user.locationId) {
    where.asset = { currentLocationId: session!.user.locationId };
  }

  const logs = await prisma.maintenanceLog.findMany({
    where,
    orderBy: { nextDueDate: "asc" },
    include: {
      asset: {
        select: {
          assetCode: true,
          name: true,
          currentLocation: { select: { name: true } },
          currentDepartment: { select: { name: true } },
          assignedUser: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/maintenance">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            Upcoming Renewals
          </h1>
          <p className="text-sm text-gray-500">{logs.length} items due within {days} days</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Asset</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Service Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Due Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Days Left</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Department</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No upcoming renewals in the next {days} days</td></tr>
            ) : (
              logs.map((log, i) => {
                const daysLeft = log.nextDueDate ? differenceInDays(new Date(log.nextDueDate), new Date()) : null;
                const urgent = daysLeft !== null && daysLeft <= 7;
                return (
                  <tr key={log.id} className={`border-b last:border-0 hover:bg-orange-50 ${i % 2 === 1 ? "bg-amber-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{log.asset.name}</p>
                      <p className="text-xs font-mono text-blue-700">
                        <Link href={`/assets/${log.assetId}`} className="hover:underline">{log.asset.assetCode}</Link>
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {SERVICE_LABELS[log.serviceType] ?? log.serviceType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.nextDueDate ? format(new Date(log.nextDueDate), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {daysLeft !== null && (
                        <Badge variant={urgent ? "destructive" : "secondary"} className={urgent ? "" : "bg-yellow-100 text-yellow-700 border-yellow-200"}>
                          {daysLeft === 0 ? "Today" : `${daysLeft} days`}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.asset.currentLocation?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{log.asset.currentDepartment?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{log.asset.assignedUser?.name ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
