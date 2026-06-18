"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Network,
  TrendingUp,
  Gift,
  Trophy,
  BarChart3,
  UserCheck,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Package,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",    href: "/admin",              icon: LayoutDashboard },
  { label: "Members",      href: "/admin/members",      icon: Users },
  { label: "MLM Tree",     href: "/admin/members/tree", icon: Network },
  { label: "Products",     href: "/admin/products",     icon: Package },
  { label: "Sales",        href: "/admin/sales",        icon: TrendingUp },
  { label: "Incentives",   href: "/admin/incentives",   icon: Gift },
  { label: "Rank Engine",  href: "/admin/ranks",        icon: Trophy },
  { label: "Payouts",      href: "/admin/payouts",      icon: Wallet },
  { label: "Reports",      href: "/admin/reports",      icon: BarChart3 },
  { label: "Team Members", href: "/admin/team",         icon: UserCheck },
];

interface AdminSidebarProps {
  user?: { name?: string | null };
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-56"
      } flex flex-col bg-white border-r border-gray-200 transition-all duration-200 shrink-0`}
    >
      {/* Logo */}
      <div
        className={`flex items-center ${
          collapsed ? "justify-center px-3" : "justify-between px-4"
        } py-4 border-b border-gray-100`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Bengal Herbovibe" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-gray-900 text-sm">Bengal Herbovibe</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 space-y-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                active
                  ? "bg-green-50 text-green-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-green-600 rounded-r-full" />
              )}
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? "text-green-600" : "text-gray-400"
                }`}
              />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 px-2 py-2 space-y-0.5">
        <Link
          href="/admin/settings"
          title={collapsed ? "Settings" : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/admin/settings"
              ? "bg-green-50 text-green-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          }`}
        >
          <Settings
            className={`w-4 h-4 shrink-0 ${
              pathname === "/admin/settings" ? "text-green-600" : "text-gray-400"
            }`}
          />
          {!collapsed && <span className="font-medium">Settings</span>}
        </Link>

        {/* User info */}
        {!collapsed && user?.name && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Logout" : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-red-500" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
