import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 7; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "Hv@" + suffix;
}

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);
  await prisma.user.update({ where: { id }, data: { password: hashed } });
  return NextResponse.json({ success: true, tempPassword });
}
