import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const member = await prisma.user.findUnique({
    where: { id },
    include: {
      sponsor: { select: { id: true, name: true, memberId: true } },
      downline: {
        where: { deletedAt: null },
        select: { id: true, name: true, memberId: true, rank: true, status: true },
      },
      salesEntries: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      piEntries: { orderBy: { createdAt: "desc" }, take: 6 },
      biEntries: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  if (!member || member.deletedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(member);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Whitelist updatable fields to prevent over-posting
  const {
    name, email, phone, status, rank, sponsorId, managedBy, joiningDate,
    panNumber, aadhaarNumber, address,
    bankAccount, ifscCode, upiId, bankName,
  } = body;

  // Guard against circular sponsorship (A sponsors B, B sponsors A)
  if (sponsorId && sponsorId !== id) {
    let cur: string | null = sponsorId;
    const visited = new Set<string>();
    while (cur) {
      if (cur === id) return NextResponse.json({ error: "Circular sponsorship detected" }, { status: 400 });
      if (visited.has(cur)) break;
      visited.add(cur);
      const u = await prisma.user.findUnique({ where: { id: cur }, select: { sponsorId: true } });
      cur = u?.sponsorId ?? null;
    }
  } else if (sponsorId === id) {
    return NextResponse.json({ error: "A member cannot sponsor themselves" }, { status: 400 });
  }

  const member = await prisma.user.update({
    where: { id },
    data: {
      ...(name         !== undefined && { name }),
      ...(email        !== undefined && { email }),
      ...(phone        !== undefined && { phone }),
      ...(status       !== undefined && { status }),
      ...(rank         !== undefined && { rank }),
      ...(sponsorId    !== undefined && { sponsorId }),
      ...(managedBy    !== undefined && { managedBy }),
      ...(joiningDate  !== undefined && { joiningDate: new Date(joiningDate) }),
      ...(panNumber    !== undefined && { panNumber }),
      ...(aadhaarNumber !== undefined && { aadhaarNumber }),
      ...(address      !== undefined && { address }),
      ...(bankAccount  !== undefined && { bankAccount }),
      ...(ifscCode     !== undefined && { ifscCode }),
      ...(upiId        !== undefined && { upiId }),
      ...(bankName     !== undefined && { bankName }),
    },
  });

  return NextResponse.json(member);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Soft delete — never hard delete financial records
  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
