import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateNextMemberId } from "@/lib/member-id";

// GET /api/members/preview-id?sponsorId=<db_id>   (omit sponsorId for root)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sponsorId = searchParams.get("sponsorId") || null;

  try {
    const memberId = await generateNextMemberId(sponsorId);

    const childCount = sponsorId
      ? await prisma.user.count({ where: { sponsorId, deletedAt: null } })
      : null;

    return NextResponse.json({ memberId, childCount, parentFull: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
