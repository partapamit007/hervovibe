"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, TrendingUp, Trophy, Wallet, User, LogOut } from "lucide-react";

const navItems = [
  { label: "Home", href: "/member", icon: Home },
  { label: "Sales", href: "/member/sales", icon: TrendingUp },
  { label: "Rank", href: "/member/rank", icon: Trophy },
  { label: "Earnings", href: "/member/earnings", icon: Wallet },
  { label: "Profile", href: "/member/profile", icon: User },
];

export default function MemberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/member" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors relative ${
              active ? "text-green-600" : "text-gray-400"
            }`}
          >
            {active && (
              <span className="absolute top-0 left-2 right-2 h-0.5 bg-green-600 rounded-b-full" />
            )}
            <Icon className="w-6 h-6 mb-0.5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex-1 flex flex-col items-center py-3 text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        <LogOut className="w-6 h-6 mb-0.5" />
        <span className="font-medium">Logout</span>
      </button>
    </nav>
  );
}
