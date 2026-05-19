import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const rank = searchParams.get("rank") || "";
  const status = searchParams.get("status") || "";

  const members = await prisma.user.findMany({
    where: {
      role: "DISTRIBUTOR",
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { memberId: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(rank && { rank: rank as any }),
      ...(status && { status: status as any }),
    },
    select: {
      id: true, name: true, email: true, phone: true,
      memberId: true, rank: true, status: true, joiningDate: true,
      sponsorId: true,
      sponsor: { select: { name: true, memberId: true } },
      _count: { select: { downline: true } },
    },
    orderBy: { joiningDate: "desc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, phone, sponsorId, managedBy } = body;

  const count = await prisma.user.count({ where: { role: "DISTRIBUTOR" } });
  const memberId = `HV-${String(count + 100).padStart(4, "0")}`;
  const password = await bcrypt.hash("Member@123", 10);

  const member = await prisma.user.create({
    data: {
      name, email, phone, memberId, password,
      role: "DISTRIBUTOR",
      rank: "DISTRIBUTOR",
      ...(sponsorId && { sponsorId }),
      ...(managedBy && { managedBy }),
    },
  });

  return NextResponse.json(member, { status: 201 });
}
