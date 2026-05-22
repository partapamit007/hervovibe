import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "DISTRIBUTOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, address, bankName, bankAccount, ifscCode, upiId } = await req.json();

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(phone       !== undefined && { phone:       phone || null }),
        ...(address     !== undefined && { address:     address || null }),
        ...(bankName    !== undefined && { bankName:    bankName || null }),
        ...(bankAccount !== undefined && { bankAccount: bankAccount || null }),
        ...(ifscCode    !== undefined && { ifscCode:    ifscCode || null }),
        ...(upiId       !== undefined && { upiId:       upiId || null }),
      },
      select: { id: true, phone: true, address: true, bankName: true, bankAccount: true, ifscCode: true, upiId: true },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.code === "P2002")
      return NextResponse.json({ error: "Phone number already in use by another member" }, { status: 409 });
    throw e;
  }
}
