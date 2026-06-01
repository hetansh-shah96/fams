import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { LocationChart } from "@/components/dashboard/location-chart";
import { addDays } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const role = session!.user.role;
  const locationId = session!.user.locationId;

  const locationFilter = role === "BRANCH_MANAGER" && locationId ? { currentLocationId: locationId } : {};

  const [
    totalAssets,
    activeAssets,
    inRepairAssets,
    idleAssets,
    retiredAssets,
    grossBlock,
    recentAllocations,
    categoryBreakdown,
    locationBreakdown,
    upcomingMaintenance,
  ] = await Promise.all([
    prisma.asset.count({ where: locationFilter }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.ACTIVE } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.IN_REPAIR } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.IDLE } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.RETIRED } }),
    prisma.asset.aggregate({ where: locationFilter, _sum: { purchaseCost: true } }),
    prisma.assetAllocation.findMany({
      where: locationFilter.currentLocationId ? { toLocationId: locationFilter.currentLocationId } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        asset: { select: { assetCode: true, name: true } },
        toLocation: { select: { name: true } },
        toDepartment: { select: { name: true } },
        transferredBy: { select: { name: true } },
      },
    }),
    prisma.assetCategory.findMany({
      include: { _count: { select: { assets: true } } },
    }),
    prisma.location.findMany({
      include: { _count: { select: { assetsAtLocation: true } } },
      take: 8,
    }),
    prisma.maintenanceLog.findMany({
      where: {
        nextDueDate: { lte: addDays(new Date(), 30), gte: new Date() },
        ...(locationId && role === "BRANCH_MANAGER" ? { asset: { currentLocationId: locationId } } : {}),
      },
      orderBy: { nextDueDate: "asc" },
      take: 8,
      include: {
        asset: { select: { assetCode: true, name: true, currentLocation: { select: { name: true } } } },
      },
    }),
  ]);

  const grossBlockValue = Number(grossBlock._sum.purchaseCost ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Fixed Asset Management Overview</p>
      </div>

      <KpiCards
        total={totalAssets}
        active={activeAssets}
        inRepair={inRepairAssets}
        idle={idleAssets}
        retired={retiredAssets}
        grossBlock={grossBlockValue}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={categoryBreakdown.map((c) => ({ name: c.name, value: c._count.assets }))} />
        <LocationChart data={locationBreakdown.map((l) => ({ name: l.name, value: l._count.assetsAtLocation }))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsWidget items={upcomingMaintenance} />
        <RecentActivity items={recentAllocations} />
      </div>
    </div>
  );
}
