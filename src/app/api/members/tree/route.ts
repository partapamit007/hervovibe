import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function buildTree(userId: string, depth = 0): Promise<any> {
  if (depth > 8) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, memberId: true, rank: true, status: true,
      downline: { select: { id: true } },
    },
  });
  if (!user) return null;

  const children = await Promise.all(
    user.downline.map((d) => buildTree(d.id, depth + 1))
  );

  return { ...user, children: children.filter(Boolean) };
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get all root members (no sponsor)
  const roots = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR", sponsorId: null },
    select: { id: true },
  });

  const trees = await Promise.all(roots.map((r) => buildTree(r.id)));
  return NextResponse.json(trees.filter(Boolean));
}
