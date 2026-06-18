export const dynamic = "force-dynamic";

import MemberBottomNav from "@/components/member/MemberBottomNav";
import { auth } from "@/lib/auth";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Bengal Herbovibe" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-bold text-gray-900 text-sm">Bengal Herbovibe</span>
        </div>
        <div className="flex items-center gap-2">
          {session?.user?.memberId && (
            <span className="text-xs text-gray-500">{session.user.memberId}</span>
          )}
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-20 p-4">{children}</main>
      <MemberBottomNav />
    </div>
  );
}
