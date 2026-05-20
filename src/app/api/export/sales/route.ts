import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year  = searchParams.get("year");

  const sales = await prisma.sale.findMany({
    where: {
      deletedAt: null,
      ...(month && year ? { month: parseInt(month), year: parseInt(year) } : {}),
    },
    include: {
      member:    { select: { name: true, memberId: true, rank: true } },
      enteredBy: { select: { name: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
  });

  const headers = ["Sale ID","Member ID","Member Name","Rank","Month","Year","Amount (₹)","Invoice","Notes","Entered By","Date"];

  const rows = sales.map((s) => [
    s.id,
    s.member.memberId ?? "",
    s.member.name,
    s.member.rank.replace(/_/g, " "),
    monthNames[s.month - 1],
    s.year.toString(),
    s.amount.toString(),
    s.invoiceUrl ?? "",
    s.notes ?? "",
    s.enteredBy.name,
    new Date(s.createdAt).toLocaleDateString("en-IN"),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="hervovibe-sales-${year ?? "all"}-${month ?? "all"}.csv"`,
    },
  });
}
