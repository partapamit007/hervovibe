"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Members", href: "/admin/members", icon: "👥" },
  { label: "MLM Tree", href: "/admin/members/tree", icon: "🌳" },
  { label: "Sales", href: "/admin/sales", icon: "💰" },
  { label: "Incentives", href: "/admin/incentives", icon: "🎁" },
  { label: "Rank Engine", href: "/admin/ranks", icon: "🏆" },
  { label: "Reports", href: "/admin/reports", icon: "📈" },
  { label: "Team Members", href: "/admin/team", icon: "🤝" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-56"} flex flex-col bg-green-800 text-white transition-all duration-200 shrink-0`}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-green-700">
        {!collapsed && <span className="font-bold text-lg">Hervovibe</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="text-green-200 hover:text-white text-xl">
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active ? "bg-green-600 text-white" : "text-green-100 hover:bg-green-700"
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-3 px-4 py-3 text-sm text-green-100 hover:bg-green-700 border-t border-green-700"
      >
        <span>🚪</span>
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}
