import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const type = searchParams.get("type");

  const records = await prisma.commissionRecord.findMany({
    where: {
      ...(memberId ? { memberId } : {}),
      ...(month && year ? { month: parseInt(month), year: parseInt(year) } : {}),
      ...(type ? { type: type as any } : {}),
    },
    include: {
      member: { select: { name: true, memberId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(records);
}
