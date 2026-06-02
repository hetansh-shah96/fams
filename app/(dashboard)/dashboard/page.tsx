import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetStatus } from "@prisma/client";
import { addDays } from "date-fns";
import Link from "next/link";
import { Package, CheckCircle, Wrench, Clock, Archive, IndianRupee, Plus, ArrowRightLeft, ClipboardCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    grossBlock, procuredAssets,
    recentAllocations, categoryBreakdown, locationBreakdown, upcomingMaintenance,
  ] = await Promise.all([
    prisma.asset.count({ where: locationFilter }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.ACTIVE } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.IN_REPAIR } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.IDLE } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.RETIRED } }),
    prisma.asset.aggregate({ where: locationFilter, _sum: { purchaseCost: true } }),
    prisma.asset.count({ where: { ...locationFilter, status: AssetStatus.PROCURED } }),
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
  ]);

  const grossBlockValue = Number(grossBlock._sum.purchaseCost ?? 0);
  const activeRate = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;

  // Group categories by their CA group for the chart
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

  const kpis = [
    { label: "Total Assets",  value: totalAssets,      href: "/assets",                       icon: Package,     color: "text-blue-600",   bg: "bg-blue-50",   border: "border-l-blue-500"   },
    { label: "Active",        value: activeAssets,     href: "/assets?status=ACTIVE",         icon: CheckCircle, color: "text-green-600",  bg: "bg-green-50",  border: "border-l-green-500"  },
    { label: "In Repair",     value: inRepairAssets,   href: "/assets?status=IN_REPAIR",      icon: Wrench,      color: "text-orange-600", bg: "bg-orange-50", border: "border-l-orange-500" },
    { label: "Idle",          value: idleAssets,       href: "/assets?status=IDLE",           icon: Clock,       color: "text-yellow-600", bg: "bg-yellow-50", border: "border-l-yellow-500" },
    { label: "Procured",      value: procuredAssets,   href: "/assets?status=PROCURED",       icon: Archive,     color: "text-cyan-600",   bg: "bg-cyan-50",   border: "border-l-cyan-500"   },
    { label: "Gross Block",   value: fmt(grossBlockValue), href: "/reports/asset-register",  icon: IndianRupee, color: "text-purple-600", bg: "bg-purple-50", border: "border-l-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fixed Asset Management · {totalAssets} assets · {activeRate}% active</p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* KPI Cards — each clickable */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className={`border-l-4 ${k.border} hover:shadow-md transition-shadow cursor-pointer`}>
              <CardContent className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${k.bg} ${k.color} mb-2`}>
                  <k.icon className="w-4 h-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-tight">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Asset utilisation mini bar */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-orange-500" />Asset Utilisation
            </span>
            <span className="text-xs text-gray-400">{activeRate}% active</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-green-400 transition-all" style={{ width: `${totalAssets > 0 ? (activeAssets / totalAssets) * 100 : 0}%` }} title={`Active: ${activeAssets}`} />
            <div className="bg-orange-400 transition-all" style={{ width: `${totalAssets > 0 ? (inRepairAssets / totalAssets) * 100 : 0}%` }} title={`In Repair: ${inRepairAssets}`} />
            <div className="bg-yellow-300 transition-all" style={{ width: `${totalAssets > 0 ? (idleAssets / totalAssets) * 100 : 0}%` }} title={`Idle: ${idleAssets}`} />
            <div className="bg-gray-200 flex-1 transition-all" title={`Retired/Other: ${retiredAssets + procuredAssets}`} />
          </div>
          <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />In Repair</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300 inline-block" />Idle</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />Other</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
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
