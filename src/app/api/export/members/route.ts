import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.user.findMany({
    where: { role: "DISTRIBUTOR", deletedAt: null },
    select: {
      memberId: true, name: true, email: true, phone: true,
      rank: true, status: true, joiningDate: true,
      panNumber: true, aadhaarNumber: true, address: true,
      bankAccount: true, ifscCode: true, upiId: true, bankName: true,
      sponsor: { select: { name: true, memberId: true } },
      _count: { select: { downline: true } },
    },
    orderBy: { memberId: "asc" },
  });

  const headers = [
    "Member ID","Name","Email","Phone","Rank","Status","Joining Date",
    "Sponsor","Sponsor ID","Direct Downline",
    "PAN","Aadhaar","Address",
    "Bank Account","IFSC","UPI ID","Bank Name",
  ];

  const rows = members.map((m) => [
    m.memberId ?? "",
    m.name,
    m.email,
    m.phone ?? "",
    m.rank.replace(/_/g, " "),
    m.status,
    new Date(m.joiningDate).toLocaleDateString("en-IN"),
    m.sponsor?.name ?? "",
    m.sponsor?.memberId ?? "",
    m._count.downline.toString(),
    m.panNumber ?? "",
    m.aadhaarNumber ?? "",
    m.address ?? "",
    m.bankAccount ?? "",
    m.ifscCode ?? "",
    m.upiId ?? "",
    m.bankName ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="hervovibe-members-${Date.now()}.csv"`,
    },
  });
}
