import MemberBottomNav from "@/components/member/MemberBottomNav";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-20 p-4">{children}</main>
      <MemberBottomNav />
    </div>
  );
}
