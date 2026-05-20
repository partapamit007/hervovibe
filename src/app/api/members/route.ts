import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const rank   = searchParams.get("rank")   || "";
  const status = searchParams.get("status") || "";
  const page   = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const all    = searchParams.get("all") === "1"; // bypass pagination for dropdowns

  const where = {
    role: "DISTRIBUTOR" as const,
    deletedAt: null,
    ...(search && {
      OR: [
        { name:     { contains: search, mode: "insensitive" as const } },
        { email:    { contains: search, mode: "insensitive" as const } },
        { memberId: { contains: search, mode: "insensitive" as const } },
        { phone:    { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(rank   && { rank:   rank   as any }),
    ...(status && { status: status as any }),
  };

  if (all) {
    const members = await prisma.user.findMany({
      where,
      select: { id: true, name: true, memberId: true, rank: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(members);
  }

  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true,
        memberId: true, rank: true, status: true, joiningDate: true,
        sponsorId: true,
        sponsor: { select: { name: true, memberId: true } },
        _count: { select: { downline: true } },
      },
      orderBy: { joiningDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    members,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, sponsorId, managedBy, joiningDate } = body;

  const count = await prisma.user.count({ where: { role: "DISTRIBUTOR" } });
  const memberId = `HV-${String(count + 100).padStart(4, "0")}`;
  const password = await bcrypt.hash("Member@123", 10);

  const member = await prisma.user.create({
    data: {
      name, email, phone, memberId, password,
      role: "DISTRIBUTOR",
      rank: "DISTRIBUTOR",
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      ...(sponsorId && { sponsorId }),
      ...(managedBy && { managedBy }),
    },
  });

  return NextResponse.json(member, { status: 201 });
}
