import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { addDays, differenceInDays, format } from "date-fns";
import Link from "next/link";
import { Bell, AlertTriangle, CheckCircle, Clock, ShieldAlert } from "lucide-react";
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

const DEFAULT_DAYS = 30;

export default async function NotificationsPage() {
  const session = await auth();
  const role = session!.user.role;
  const locationId = session!.user.locationId;
  const locationFilter = role === "BRANCH_MANAGER" && locationId ? { asset: { currentLocationId: locationId } } : {};
  const assetFilter = role === "BRANCH_MANAGER" && locationId ? { currentLocationId: locationId } : {};

  // Load alert configs to respect per-type daysBeforeAlert
  const alertConfigs = await prisma.alertConfig.findMany();
  const getAlertDays = (type: string) =>
    alertConfigs.find((c) => c.type === type)?.daysBeforeAlert ?? DEFAULT_DAYS;
  const getAlertActive = (type: string) =>
    alertConfigs.find((c) => c.type === type)?.isActive ?? true;

  const maintDays = getAlertDays("SCHEDULED_SERVICE");
  const warrantyDays = getAlertDays("WARRANTY_EXPIRY");
  const insuranceDays = getAlertDays("INSURANCE_EXPIRY");
  const pucDays = getAlertDays("PUC_EXPIRY");
  const amcDays = getAlertDays("AMC_EXPIRY");

  const now = new Date();

  const [overdue, dueSoon, schedulesOverdue, schedulesDueSoon, warrantyAlerts, insuranceAlerts, pucAlerts] = await Promise.all([
    // Overdue maintenance logs
    prisma.maintenanceLog.findMany({
      where: { nextDueDate: { lt: now }, resolvedAt: null, ...locationFilter },
      orderBy: { nextDueDate: "asc" },
      take: 20,
      include: { asset: { select: { id: true, assetCode: true, name: true, currentLocation: { select: { name: true } } } } },
    }),
    // Maintenance logs due within configured window
    prisma.maintenanceLog.findMany({
      where: { nextDueDate: { gte: now, lte: addDays(now, maintDays) }, resolvedAt: null, ...locationFilter },
      orderBy: { nextDueDate: "asc" },
      take: 30,
      include: { asset: { select: { id: true, assetCode: true, name: true, currentLocation: { select: { name: true } } } } },
    }),
    // Preventive schedules overdue
    prisma.maintenanceSchedule.findMany({
      where: { isActive: true, nextDueDate: { lt: now }, ...(locationId && role === "BRANCH_MANAGER" ? { asset: { currentLocationId: locationId } } : {}) },
      orderBy: { nextDueDate: "asc" },
      take: 20,
      include: { asset: { select: { id: true, assetCode: true, name: true, currentLocation: { select: { name: true } } } } },
    }),
    // Preventive schedules due soon
    prisma.maintenanceSchedule.findMany({
      where: { isActive: true, nextDueDate: { gte: now, lte: addDays(now, amcDays) }, ...(locationId && role === "BRANCH_MANAGER" ? { asset: { currentLocationId: locationId } } : {}) },
      orderBy: { nextDueDate: "asc" },
      take: 30,
      include: { asset: { select: { id: true, assetCode: true, name: true, currentLocation: { select: { name: true } } } } },
    }),
    // Warranty: already expired + expiring soon
    getAlertActive("WARRANTY_EXPIRY") ? prisma.asset.findMany({
      where: { warrantyExpiry: { lte: addDays(now, warrantyDays) }, status: { not: "DISPOSED" }, ...assetFilter },
      orderBy: { warrantyExpiry: "asc" },
      take: 20,
      select: { id: true, assetCode: true, name: true, warrantyExpiry: true, currentLocation: { select: { name: true } } },
    }) : Promise.resolve([]),
    // Insurance: already expired + expiring soon
    getAlertActive("INSURANCE_EXPIRY") ? prisma.asset.findMany({
      where: { insuranceExpiry: { lte: addDays(now, insuranceDays) }, status: { not: "DISPOSED" }, ...assetFilter },
      orderBy: { insuranceExpiry: "asc" },
      take: 20,
      select: { id: true, assetCode: true, name: true, insuranceExpiry: true, currentLocation: { select: { name: true } } },
    }) : Promise.resolve([]),
    // PUC: already expired + expiring soon
    getAlertActive("PUC_EXPIRY") ? prisma.asset.findMany({
      where: { pucExpiry: { lte: addDays(now, pucDays) }, status: { not: "DISPOSED" }, ...assetFilter },
      orderBy: { pucExpiry: "asc" },
      take: 20,
      select: { id: true, assetCode: true, name: true, pucExpiry: true, currentLocation: { select: { name: true } } },
    }) : Promise.resolve([]),
  ]);

  const totalAlerts = overdue.length + dueSoon.length + schedulesOverdue.length + schedulesDueSoon.length +
    warrantyAlerts.length + insuranceAlerts.length + pucAlerts.length;

  function DaysChip({ date }: { date: Date | string }) {
    const d = differenceInDays(new Date(date), now);
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

      {schedulesOverdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-4 h-4" />Overdue Preventive Schedules ({schedulesOverdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedulesOverdue.map(s => (
              <AssetRow key={s.id} id={s.asset.id} assetCode={s.asset.assetCode} name={s.asset.name}
                date={s.nextDueDate} label={`Schedule: ${s.serviceType.replace(/_/g, " ")}`}
                location={s.asset.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {dueSoon.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />Maintenance Due in {maintDays} Days ({dueSoon.length})
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

      {schedulesDueSoon.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />Preventive Schedules Due in {amcDays} Days ({schedulesDueSoon.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedulesDueSoon.map(s => (
              <AssetRow key={s.id} id={s.asset.id} assetCode={s.asset.assetCode} name={s.asset.name}
                date={s.nextDueDate} label={`Schedule: ${s.serviceType.replace(/_/g, " ")}`}
                location={s.asset.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {warrantyAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-500" />Warranty Expired / Expiring ({warrantyAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warrantyAlerts.map(a => (
              <AssetRow key={a.id} id={a.id} assetCode={a.assetCode} name={a.name}
                date={a.warrantyExpiry!} label="Warranty" location={a.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {insuranceAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />Insurance Expired / Expiring ({insuranceAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceAlerts.map(a => (
              <AssetRow key={a.id} id={a.id} assetCode={a.assetCode} name={a.name}
                date={a.insuranceExpiry!} label="Insurance" location={a.currentLocation?.name ?? "—"} />
            ))}
          </CardContent>
        </Card>
      )}

      {pucAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />PUC Expired / Expiring ({pucAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pucAlerts.map(a => (
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
            <p className="text-gray-400 text-sm mt-1">No overdue maintenance, expired documents, or due schedules</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
