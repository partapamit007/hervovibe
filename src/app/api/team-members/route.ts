import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamMembers = await prisma.user.findMany({
    where: { role: "TEAM_MEMBER", deletedAt: null },
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true,
      _count: { select: { managedUsers: { where: { deletedAt: null } } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(teamMembers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email, phone } = await req.json();
  if (!name || !email)
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });

  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const tempPwd = "Hv@" + Array.from({ length: 7 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const password = await bcrypt.hash(tempPwd, 10);

  try {
    const user = await prisma.user.create({
      data: { name, email, phone: phone || null, password, role: "TEAM_MEMBER" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });
    return NextResponse.json({ ...user, tempPassword: tempPwd }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Email or phone already in use" }, { status: 409 });
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Unassign all managed distributors before removing
  await prisma.user.updateMany({ where: { managedBy: id }, data: { managedBy: null } });
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
