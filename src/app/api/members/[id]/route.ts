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
      downline: { select: { id: true, name: true, memberId: true, rank: true, status: true } },
      salesEntries: { orderBy: { createdAt: "desc" }, take: 12 },
      piEntries: { orderBy: { createdAt: "desc" }, take: 6 },
      biEntries: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(member);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const member = await prisma.user.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(member);
}
