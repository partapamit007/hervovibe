import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "TEAM_MEMBER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const members = await prisma.user.findMany({
    where: { managedBy: session.user.id, role: "DISTRIBUTOR" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      memberId: true,
      rank: true,
      status: true,
      joiningDate: true,
      sponsor: { select: { name: true, memberId: true } },
    },
    orderBy: { joiningDate: "desc" },
  });
  return NextResponse.json(members);
}
