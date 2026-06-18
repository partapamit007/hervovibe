import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { computeIdColor } from "@/lib/idColor";
import { generateNextMemberId } from "@/lib/member-id";

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

  const idColorParam = searchParams.get("idColor") || "";

  const memberSelect = {
    id: true, name: true, email: true, phone: true,
    memberId: true, rank: true, status: true, joiningDate: true,
    sponsorId: true,
    sponsor: { select: { name: true, memberId: true } },
    _count: { select: { downline: true } },
    salesEntries: {
      where: { OR: colorMonths },
      select: { month: true, year: true, amount: true },
    },
  };

  // When filtering by idColor, fetch ALL members (color is computed, not stored in DB)
  // then filter + paginate in memory to get correct counts.
  if (idColorParam) {
    const allMembers = await prisma.user.findMany({ where, select: memberSelect, orderBy: { joiningDate: "desc" } });
    const allWithColor = allMembers.map((m) => ({
      ...m,
      idColor: computeIdColor(m.salesEntries, curMonth, curYear),
      salesEntries: undefined,
    }));
    const filtered = allWithColor.filter((m) => m.idColor === idColorParam);
    const start = (page - 1) * PAGE_SIZE;
    return NextResponse.json({
      members: filtered.slice(start, start + PAGE_SIZE),
      total: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(filtered.length / PAGE_SIZE),
    });
  }

  const [members, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: memberSelect,
      orderBy: { joiningDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  const membersWithColor = members.map((m) => ({
    ...m,
    idColor: computeIdColor(m.salesEntries, curMonth, curYear),
    salesEntries: undefined,
  }));

  return NextResponse.json({
    members: membersWithColor,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "MASTER_ADMIN")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, email, phone, sponsorId, managedBy, joiningDate,
            panNumber, aadhaarNumber, address,
            bankName, bankAccount, ifscCode, upiId,
            memberId: customMemberId } = body;

    if (!name || !name.trim())
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });

    let memberId: string;
    if (customMemberId && customMemberId.trim()) {
      const existing = await prisma.user.findFirst({ where: { memberId: customMemberId.trim() } });
      if (existing) return NextResponse.json({ error: "Member ID already in use" }, { status: 400 });
      memberId = customMemberId.trim();
    } else {
      // Auto-generate tree-based ID from sponsor
      memberId = await generateNextMemberId(sponsorId || null);
      // Double-check uniqueness (race condition guard)
      const existing = await prisma.user.findFirst({ where: { memberId } });
      if (existing) return NextResponse.json({ error: "Generated ID conflict, please retry" }, { status: 400 });
    }

    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    const tempPwd = "Hv@" + Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const password = await bcrypt.hash(tempPwd, 10);

    const rand = Math.random().toString(36).slice(2, 6);
    const resolvedEmail = (email && email.trim())
      ? email.trim()
      : `${memberId.toLowerCase().replace(/[^a-z0-9]/g, "")}_${rand}@hv.local`;

    const member = await prisma.user.create({
      data: {
        name: name.trim(), email: resolvedEmail, phone: phone || null, memberId, password,
        role: "DISTRIBUTOR",
        rank: "DISTRIBUTOR",
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        ...(sponsorId     && { sponsorId }),
        ...(managedBy     && { managedBy }),
        ...(panNumber     && { panNumber }),
        ...(aadhaarNumber && { aadhaarNumber }),
        ...(address       && { address }),
        ...(bankName      && { bankName }),
        ...(bankAccount   && { bankAccount }),
        ...(ifscCode      && { ifscCode }),
        ...(upiId         && { upiId }),
      },
    });

    return NextResponse.json({ ...member, tempPassword: tempPwd }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/members]", err);
    if (err?.code === "P2002") return NextResponse.json({ error: "A member with this ID or email already exists" }, { status: 400 });
    return NextResponse.json({ error: err?.message || "Failed to create member" }, { status: 500 });
  }
}
