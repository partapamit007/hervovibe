import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ONE-TIME USE: Creates admin account if it doesn't exist. Delete this file after initial setup.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (secret !== process.env.INIT_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.user.findUnique({ where: { email: "admin@hervovibe.in" } });
  if (existing)
    return NextResponse.json({ error: "Admin already exists. Use ?secret=... and force=1 to reset password." }, { status: 409 });

  const password = await bcrypt.hash("Admin@2026", 10);
  const admin = await prisma.user.create({
    data: {
      name: "Master Admin",
      email: "admin@hervovibe.in",
      password,
      role: "MASTER_ADMIN",
      memberId: "HV-ADMIN",
      phone: "9999999999",
      joiningDate: new Date(),
    },
  });

  return NextResponse.json({ ok: true, email: admin.email, message: "Admin created. Password: Admin@2026" });
}
