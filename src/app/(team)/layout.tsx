export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import TeamSidebar from "@/components/team/TeamSidebar";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="flex h-screen bg-gray-50">
      <TeamSidebar user={session?.user} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
