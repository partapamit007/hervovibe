import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { computeIdColor } from "@/lib/idColor";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search    = searchParams.get("search")    || "";
  const rank      = searchParams.get("rank")      || "";
  const status    = searchParams.get("status")    || "";
  const managedBy = searchParams.get("managedBy") || "";
  const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const all       = searchParams.get("all") === "1";

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
    ...(rank      && { rank:      rank      as any }),
    ...(status    && { status:    status    as any }),
    ...(managedBy && { managedBy }),
  };

  if (all) {
    const members = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, memberId: true, rank: true, phone: true,
        _count: { select: { downline: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(members);
  }

  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  // Fetch 4 months of sales history to compute ID color (current + last 3)
  const colorMonths: { month: number; year: number }[] = [];
  for (let i = 0; i < 4; i++) {
    let m = curMonth - i; let y = curYear;
    if (m <= 0) { m += 12; y -= 1; }
    colorMonths.push({ month: m, year: y });
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
        salesEntries: {
          where: { OR: colorMonths },
          select: { month: true, year: true, amount: true },
        },
      },
      orderBy: { joiningDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const idColorParam = searchParams.get("idColor") || "";

  let membersWithColor = members.map((m) => ({
    ...m,
    idColor: computeIdColor(m.salesEntries, curMonth, curYear),
    salesEntries: undefined,
  }));

  // Filter by ID color client-side (color computed from sales, not stored in DB)
  if (idColorParam) {
    membersWithColor = membersWithColor.filter((m) => m.idColor === idColorParam);
  }

  return NextResponse.json({
    members: membersWithColor,
    total: idColorParam ? membersWithColor.length : total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: idColorParam ? Math.ceil(membersWithColor.length / PAGE_SIZE) : Math.ceil(total / PAGE_SIZE),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, phone, sponsorId, managedBy, joiningDate,
          panNumber, aadhaarNumber, address,
          bankName, bankAccount, ifscCode, upiId,
          memberId: customMemberId } = body;

  let memberId: string;
  if (customMemberId && customMemberId.trim()) {
    const existing = await prisma.user.findFirst({ where: { memberId: customMemberId.trim() } });
    if (existing) return NextResponse.json({ error: "Member ID already in use" }, { status: 400 });
    memberId = customMemberId.trim();
  } else {
    const count = await prisma.user.count({ where: { role: "DISTRIBUTOR" } });
    memberId = `HV-${String(count + 100).padStart(4, "0")}`;
  }
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const tempPwd = "Hv@" + Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const password = await bcrypt.hash(tempPwd, 10);

  const member = await prisma.user.create({
    data: {
      name, email, phone, memberId, password,
      role: "DISTRIBUTOR",
      rank: "DISTRIBUTOR",
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      ...(sponsorId    && { sponsorId }),
      ...(managedBy    && { managedBy }),
      ...(panNumber    && { panNumber }),
      ...(aadhaarNumber && { aadhaarNumber }),
      ...(address      && { address }),
      ...(bankName     && { bankName }),
      ...(bankAccount  && { bankAccount }),
      ...(ifscCode     && { ifscCode }),
      ...(upiId        && { upiId }),
    },
  });

  return NextResponse.json({ ...member, tempPassword: tempPwd }, { status: 201 });
}
