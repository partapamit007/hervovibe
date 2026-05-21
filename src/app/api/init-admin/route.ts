import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ONE-TIME USE: Creates/resets admin account. Delete this file after use.
export async function GET() {
  const secret = "hervovibe-reset-2026";
  const password = await bcrypt.hash("Admin@2026", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@hervovibe.in" },
    update: { password },
    create: {
      name: "Master Admin",
      email: "admin@hervovibe.in",
      password,
      role: "MASTER_ADMIN",
      memberId: "HV-ADMIN",
      phone: "9999999999",
      joiningDate: new Date(),
    },
  });

  return NextResponse.json({ ok: true, email: admin.email, message: "Password set to Admin@2026" });
}
