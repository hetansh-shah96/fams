import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { addDays, endOfMonth } from "date-fns";
import Link from "next/link";
import {
  Package, CheckCircle, Wrench, Clock,
  IndianRupee, Plus, ArrowRightLeft, ClipboardCheck,
  ShoppingCart, AlertTriangle, ShieldAlert, Trash2,
} from "lucide-react";
import { AlertsWidget } from "@/components/dashboard/alerts-widget";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { GroupedBarChart } from "@/components/dashboard/grouped-bar-chart";
import { LocationBarChart } from "@/components/dashboard/location-bar-chart";

function fmt(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

export default async function DashboardPage() {
  const session = await auth();
  const role = session!.user.role;
  const locationId = session!.user.locationId;
  const locationFilter = role === "BRANCH_MANAGER" && locationId ? { currentLocationId: locationId } : {};

  const [
    totalAssets, activeAssets, inRepairAssets, idleAssets, retiredAssets,
    grossBlock, procuredAssets, inTransitAssets,
    recentAllocations, categoryBreakdown, locationBreakdown, upcomingMaintenance,
    openPOs, pendingDisposal, overdueSchedules, warrantyExpiring,
  ] = await Promise.all([
    prisma.asset.count({ where: locationFilter }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.ACTIVE } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.IN_REPAIR } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.IDLE } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.RETIRED } }),
    prisma.asset.aggregate({ where: locationFilter, _sum: { purchaseCost: true } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.PROCURED } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.IN_TRANSIT } }),
    prisma.assetAllocation.findMany({
      where: locationFilter.currentLocationId ? { toLocationId: locationFilter.currentLocationId } : {},
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        asset: { select: { id: true, assetCode: true, name: true } },
        toLocation: { select: { name: true } },
        toDepartment: { select: { name: true } },
        transferredBy: { select: { name: true } },
      },
    }),
    prisma.assetCategory.findMany({
      where: { assets: { some: locationFilter } },
      include: { _count: { select: { assets: { where: locationFilter } } } },
    }),
    prisma.location.findMany({
      include: { _count: { select: { assetsAtLocation: { where: locationFilter } } } },
      take: 10,
    }),
    prisma.maintenanceLog.findMany({
      where: {
        nextDueDate: { lte: addDays(new Date(), 30), gte: new Date() },
        ...(locationId && role === "BRANCH_MANAGER" ? { asset: { currentLocationId: locationId } } : {}),
      },
      orderBy: { nextDueDate: "asc" },
      take: 8,
      include: { asset: { select: { id: true, assetCode: true, name: true, currentLocation: { select: { name: true } } } } },
    }),
    prisma.purchaseOrder.count({ where: { status: { not: "CLOSED" } } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.RETIRED } }),
    prisma.maintenanceSchedule.count({
      where: {
        isActive: true,
        nextDueDate: { lt: new Date() },
        ...(locationId && role === "BRANCH_MANAGER" ? { asset: { currentLocationId: locationId } } : {}),
      },
    }),
    prisma.asset.count({
      where: {
        ...locationFilter,
        warrantyExpiry: { gte: new Date(), lte: endOfMonth(new Date()) },
      },
    }),
  ]);

  const grossBlockValue = Number(grossBlock._sum.purchaseCost ?? 0);
  const activeRate = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;
  const otherAssets = procuredAssets + inTransitAssets + retiredAssets;

  const groupMap = categoryBreakdown.reduce<Record<string, number>>((acc, cat) => {
    const key = cat.group ?? cat.name;
    acc[key] = (acc[key] ?? 0) + cat._count.assets;
    return acc;
  }, {});
  const groupChartData = Object.entries(groupMap)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, value]) => ({ name, value }));

  const locationChartData = locationBreakdown
    .filter(l => l._count.assetsAtLocation > 0)
    .map(l => ({ name: l.name, value: l._count.assetsAtLocation, id: l.id }));

  const hasAlerts = overdueSchedules > 0 || warrantyExpiring > 0;

  return (
    <div className="space-y-5">
      {/* Alert strip */}
      {hasAlerts && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
          <div className="text-sm text-orange-800 flex flex-wrap gap-x-4 gap-y-1">
            {overdueSchedules > 0 && (
              <Link href="/notifications" className="hover:underline font-medium">
                {overdueSchedules} overdue maintenance schedule{overdueSchedules !== 1 ? "s" : ""}
              </Link>
            )}
            {warrantyExpiring > 0 && (
              <Link href="/notifications" className="hover:underline font-medium">
                {warrantyExpiring} warranty expiring this month
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fixed Asset Management · {totalAssets} assets · {activeRate}% active</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/assets/new">
            <button className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />Add Asset
            </button>
          </Link>
          <Link href="/transfers/new">
            <button className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
              <ArrowRightLeft className="w-4 h-4" />Transfer
            </button>
          </Link>
          <Link href="/audit">
            <button className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors">
              <ClipboardCheck className="w-4 h-4" />Audit
            </button>
          </Link>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/assets">
          <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 leading-none">{totalAssets}</p>
            <p className="text-sm text-gray-500 mt-1">Total Assets</p>
          </div>
        </Link>
        <Link href="/assets?status=ACTIVE">
          <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100 transition-colors">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{activeRate}%</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 leading-none">{activeAssets}</p>
            <p className="text-sm text-gray-500 mt-1">Active</p>
          </div>
        </Link>
        <Link href="/reports/asset-register">
          <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-colors">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{fmt(grossBlockValue)}</p>
            <p className="text-sm text-gray-500 mt-1">Gross Block</p>
          </div>
        </Link>
        <Link href="/assets?status=IN_REPAIR">
          <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 rounded-lg bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 leading-none">{inRepairAssets}</p>
            <p className="text-sm text-gray-500 mt-1">In Repair</p>
          </div>
        </Link>
      </div>

      {/* Status utilisation bar */}
      <div className="bg-white border rounded-xl px-4 py-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-gray-600">Asset Status Breakdown</span>
          <span className="text-xs text-gray-400">{totalAssets} total</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          <div className="bg-green-400" style={{ width: `${totalAssets > 0 ? (activeAssets / totalAssets) * 100 : 0}%` }} title={`Active: ${activeAssets}`} />
          <div className="bg-orange-400" style={{ width: `${totalAssets > 0 ? (inRepairAssets / totalAssets) * 100 : 0}%` }} title={`In Repair: ${inRepairAssets}`} />
          <div className="bg-yellow-300" style={{ width: `${totalAssets > 0 ? (idleAssets / totalAssets) * 100 : 0}%` }} title={`Idle: ${idleAssets}`} />
          <div className="bg-gray-200 flex-1" title={`Other (retired, in transit, etc.): ${otherAssets}`} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Active ({activeAssets})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />In Repair ({inRepairAssets})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block" />Idle ({idleAssets})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Other ({otherAssets})</span>
        </div>
      </div>

      {/* Operational alerts row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/purchase-orders">
          <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group border-l-4 border-l-indigo-400">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 inline-flex mb-2 group-hover:bg-indigo-100 transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{openPOs}</p>
            <p className="text-xs text-gray-500 mt-1">Open Purchase Orders</p>
          </div>
        </Link>
        <Link href="/assets?status=RETIRED">
          <div className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group border-l-4 border-l-red-400">
            <div className="p-2 rounded-lg bg-red-50 text-red-600 inline-flex mb-2 group-hover:bg-red-100 transition-colors">
              <Trash2 className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{pendingDisposal}</p>
            <p className="text-xs text-gray-500 mt-1">Pending Disposal</p>
          </div>
        </Link>
        <Link href="/notifications">
          <div className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group border-l-4 ${overdueSchedules > 0 ? "border-l-orange-500" : "border-l-gray-200"}`}>
            <div className={`p-2 rounded-lg inline-flex mb-2 transition-colors ${overdueSchedules > 0 ? "bg-orange-50 text-orange-600 group-hover:bg-orange-100" : "bg-gray-50 text-gray-400"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{overdueSchedules}</p>
            <p className="text-xs text-gray-500 mt-1">Overdue Maintenance</p>
          </div>
        </Link>
        <Link href="/notifications">
          <div className={`bg-white border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group border-l-4 ${warrantyExpiring > 0 ? "border-l-yellow-500" : "border-l-gray-200"}`}>
            <div className={`p-2 rounded-lg inline-flex mb-2 transition-colors ${warrantyExpiring > 0 ? "bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100" : "bg-gray-50 text-gray-400"}`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none">{warrantyExpiring}</p>
            <p className="text-xs text-gray-500 mt-1">Warranty Expiring</p>
          </div>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GroupedBarChart data={groupChartData} />
        </div>
        <div>
          <LocationBarChart data={locationChartData} />
        </div>
      </div>

      {/* Alerts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertsWidget items={upcomingMaintenance} />
        <RecentActivity items={recentAllocations} />
      </div>
    </div>
  );
}
