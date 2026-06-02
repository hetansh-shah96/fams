"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowRightLeft,
  Calculator,
  Wrench,
  ClipboardCheck,
  FileBarChart,
  Settings,
  Building2,
  QrCode,
  Bell,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Assets",
    icon: Package,
    children: [
      { href: "/assets", label: "Asset List" },
      { href: "/assets/new", label: "Add Asset" },
      { href: "/assets/import", label: "Bulk Import" },
      { href: "/assets/qr-scanner", label: "QR Scanner" },
    ],
  },
  {
    label: "Transfers",
    icon: ArrowRightLeft,
    children: [
      { href: "/transfers", label: "Transfer List" },
      { href: "/transfers/new", label: "New Transfer" },
    ],
  },
  { href: "/depreciation", label: "Depreciation", icon: Calculator },
  {
    label: "Maintenance",
    icon: Wrench,
    children: [
      { href: "/maintenance", label: "Maintenance Logs" },
      { href: "/maintenance/new", label: "Add Log" },
      { href: "/maintenance/renewals", label: "Upcoming Renewals" },
    ],
  },
  { href: "/audit", label: "Audit", icon: ClipboardCheck },
  {
    label: "Reports",
    icon: FileBarChart,
    children: [
      { href: "/reports/asset-register", label: "Asset Register" },
      { href: "/reports/depreciation", label: "Depreciation Schedule" },
      { href: "/reports/disposal", label: "Disposal Report" },
      { href: "/reports/utilization", label: "Utilization Report" },
      { href: "/reports/custody", label: "Custody Report" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { href: "/settings/company", label: "Companies & Branches" },
      { href: "/settings/departments", label: "Departments" },
      { href: "/settings/categories", label: "Asset Categories" },
      { href: "/settings/suppliers", label: "Suppliers" },
      { href: "/settings/users", label: "Users" },
      { href: "/settings/alerts", label: "Alert Config" },
      { href: "/settings/audit-log", label: "Audit Log" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggleGroup(label: string) {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function isGroupActive(children: { href: string }[]) {
    return children.some((c) => pathname.startsWith(c.href));
  }

  return (
    <aside className="w-60 bg-gray-900 text-gray-100 flex flex-col h-screen fixed left-0 top-0 z-30 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
        <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-white">FAMS</p>
          <p className="text-xs text-gray-400">Asset Management</p>
        </div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map((item) => {
          if (!item.children) {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-orange-500 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          }

          const groupOpen = openGroups[item.label] ?? isGroupActive(item.children);
          const groupActive = isGroupActive(item.children);

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-2.5 text-sm transition-colors",
                  groupActive ? "text-orange-400" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </span>
                {groupOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
              {groupOpen && (
                <div className="bg-gray-950">
                  {item.children.map((child) => {
                    const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center pl-12 pr-5 py-2 text-sm transition-colors",
                          childActive
                            ? "text-orange-400 bg-gray-800"
                            : "text-gray-400 hover:text-white hover:bg-gray-800"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <Link
          href="/notifications"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <Bell className="w-4 h-4" />
          Notifications
        </Link>
      </div>
    </aside>
  );
}
