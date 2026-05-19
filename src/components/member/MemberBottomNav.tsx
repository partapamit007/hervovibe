"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Home", href: "/member", icon: "🏠" },
  { label: "Sales", href: "/member/sales", icon: "💰" },
  { label: "Rank", href: "/member/rank", icon: "🏆" },
  { label: "Earnings", href: "/member/earnings", icon: "💵" },
  { label: "Profile", href: "/member/profile", icon: "👤" },
];

export default function MemberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== "/member" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              active ? "text-green-600" : "text-gray-400"
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex-1 flex flex-col items-center py-2 text-xs text-gray-400"
      >
        <span className="text-xl mb-0.5">🚪</span>
        <span>Logout</span>
      </button>
    </nav>
  );
}
