import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { addDays, differenceInDays, format, isPast } from "date-fns";
import Link from "next/link";
import { Bell, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  AMC_VISIT: "AMC Visit",
  BREAKDOWN_REPAIR: "Breakdown Repair",
  SCHEDULED_SERVICE: "Scheduled Service",
  INSURANCE_RENEWAL: "Insurance Renewal",
  PUC_RENEWAL: "PUC Renewal",
  WARRANTY_CLAIM: "Warranty Claim",
  OTHER: "Other",
};

export default async function NotificationsPage() {
  const session = await auth();
  const role = session!.user.role;
  const locationId = session!.user.locationId;
  const locationFilter = role === "BRANCH_MANAGER" && locationId ? { asset: { currentLocationId: locationId } } : {};

  const [overdue, dueSoon, warrantyExpiring, insuranceExpiring, pucExpiring] = await Promise.all([
    // Overdue maintenance
    prisma.maintenanceLog.findMany({
      where: { nextDueDate: { lt: new Date() }, resolvedAt: null, ...locationFilter },
      orderBy: { nextDueDate: "asc" },
      take: 20,
      include: { asset: { select: { id: true, assetCode: true, name: true, currentLocation: { select: { name: true } } } } },
    }),
    // Due within 30 days
    prisma.maintenanceLog.findMany({
      where: { nextDueDate: { gte: new Date(), lte: addDays(new Date(), 30) }, ...locationFilter },
      orderBy: { nextDueDate: "asc" },
      take: 30,
      include: { asset: { select: { id: true, assetCode: true, name: true, currentLocation: { select: { name: true } } } } },
    }),
    // Warranty expiring in 30 days
    prisma.asset.findMany({
      where: {
        warrantyExpiry: { gte: new Date(), lte: addDays(new Date(), 30) },
        ...(locationId && role === "BRANCH_MANAGER" ? { currentLocationId: locationId } : {}),
      },
      orderBy: { warrantyExpiry: "asc" },
      take: 20,
      select: { id: true, assetCode: true, name: true, warrantyExpiry: true, currentLocation: { select: { name: true } } },
    }),
    // Insurance expiring in 30 days
    prisma.asset.findMany({
      where: {
        insuranceExpiry: { gte: new Date(), lte: addDays(new Date(), 30) },
        ...(locationId && role === "BRANCH_MANAGER" ? { currentLocationId: locationId } : {}),
      },
      orderBy: { insuranceExpiry: "asc" },
      take: 20,
      select: { id: true, assetCode: true, name: true, insuranceExpiry: true, currentLocation: { select: { name: true } } },
    }),
    // PUC expiring in 30 days
    prisma.asset.findMany({
      where: {
        pucExpiry: { gte: new Date(), lte: addDays(new Date(), 30) },
        ...(locationId && role === "BRANCH_MANAGER" ? { currentLocationId: locationId } : {}),
      },
      orderBy: { pucExpiry: "asc" },
      take: 20,
      select: { id: true, assetCode: true, name: true, pucExpiry: true, currentLocation: { select: { name: true } } },
    }),
  ]);

  const totalAlerts = overdue.length + dueSoon.length + warrantyExpiring.length + insuranceExpiring.length + pucExpiring.length;

  function DaysChip({ date }: { date: Date | string }) {
    const d = differenceInDays(new Date(date), new Date());
    const past = d < 0;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${past ? "bg-red-100 text-red-700" : d <= 7 ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
        {past ? `${Math.abs(d)}d overdue` : d === 0 ? "Today" : `${d}d left`}
      </span>
    );
  }

  function AssetRow({ id, assetCode, name, date, label, location }: { id: string; assetCode: string; name: string; date: Date | string; label: string; location: string }) {
    return (
      <Link href={`/assets/${id}`} className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-orange-50 -mx-2 px-2 rounded transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500">{assetCode} · {label} · {location}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-xs text-gray-400">{format(new Date(date), "dd MMM yy")}</span>
          <DaysChip date={date} />
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
          <Bell className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">{totalAlerts} active alerts</p>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />Overdue Maintenance ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdue.map(m => (
              <AssetRow key={m.id} id={m.asset.id} assetCode={m.asset.assetCode} name={m.asset.name}
                date={m.nextDueDate!} label={TYPE_LABELS[m.serviceType] ?? m.serviceType}
                location={m.asset.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Due Soon */}
      {dueSoon.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />Maintenance Due in 30 Days ({dueSoon.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dueSoon.map(m => (
              <AssetRow key={m.id} id={m.asset.id} assetCode={m.asset.assetCode} name={m.asset.name}
                date={m.nextDueDate!} label={TYPE_LABELS[m.serviceType] ?? m.serviceType}
                location={m.asset.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warranty */}
      {warrantyExpiring.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />Warranty Expiring ({warrantyExpiring.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warrantyExpiring.map(a => (
              <AssetRow key={a.id} id={a.id} assetCode={a.assetCode} name={a.name}
                date={a.warrantyExpiry!} label="Warranty" location={a.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insurance */}
      {insuranceExpiring.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />Insurance Expiring ({insuranceExpiring.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceExpiring.map(a => (
              <AssetRow key={a.id} id={a.id} assetCode={a.assetCode} name={a.name}
                date={a.insuranceExpiry!} label="Insurance" location={a.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* PUC */}
      {pucExpiring.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />PUC Expiring ({pucExpiring.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pucExpiring.map(a => (
              <AssetRow key={a.id} id={a.id} assetCode={a.assetCode} name={a.name}
                date={a.pucExpiry!} label="PUC" location={a.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {totalAlerts === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">All clear — no active alerts</p>
            <p className="text-gray-400 text-sm mt-1">No overdue maintenance or expiring documents</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
