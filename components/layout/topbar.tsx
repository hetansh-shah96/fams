"use client";

import { signOut } from "next-auth/react";
import { Bell, LogOut, User, ChevronDown, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  onMenuToggle: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BRANCH_MANAGER: "Branch Manager",
  DEPT_HEAD: "Dept Head",
  EMPLOYEE: "Employee",
};

export function Topbar({ user, onMenuToggle }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      {/* Hamburger — only visible on mobile/tablet */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user.name}</p>
              <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-orange-300 text-orange-600">
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="text-sm text-gray-500 cursor-default">
              {user.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
