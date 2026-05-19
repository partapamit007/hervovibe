import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role === "MASTER_ADMIN") redirect("/admin");
  if (role === "TEAM_MEMBER") redirect("/team");
  redirect("/member");
}
