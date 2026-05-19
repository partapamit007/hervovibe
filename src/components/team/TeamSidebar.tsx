"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Dashboard", href: "/team", icon: "📊" },
  { label: "My Members", href: "/team/members", icon: "👥" },
  { label: "Add Sale", href: "/team/sales/new", icon: "➕" },
  { label: "Sales History", href: "/team/sales", icon: "📋" },
];

export default function TeamSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex flex-col bg-blue-800 text-white shrink-0">
      <div className="px-4 py-4 border-b border-blue-700">
        <span className="font-bold text-lg">Hervovibe</span>
        <p className="text-blue-200 text-xs mt-0.5">Team Member</p>
      </div>

      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/team" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-700"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-3 px-4 py-3 text-sm text-blue-100 hover:bg-blue-700 border-t border-blue-700"
      >
        <span>🚪</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
