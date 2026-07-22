import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch all members in one query, build tree in memory — avoids N+1
  const allMembers = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR", deletedAt: null },
    select: { id: true, name: true, memberId: true, rank: true, status: true, sponsorId: true },
    orderBy: { createdAt: "asc" },
  });

  type TreeNode = {
    id: string; name: string; memberId: string; rank: string;
    status: string; children: TreeNode[];
  };

  const nodeMap = new Map<string, TreeNode>();
  for (const m of allMembers) {
    nodeMap.set(m.id, { id: m.id, name: m.name, memberId: m.memberId, rank: m.rank, status: m.status, children: [] });
  }

  const roots: TreeNode[] = [];
  for (const m of allMembers) {
    const node = nodeMap.get(m.id)!;
    if (m.sponsorId && nodeMap.has(m.sponsorId)) {
      nodeMap.get(m.sponsorId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json(roots);
}
