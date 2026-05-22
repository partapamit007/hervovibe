import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateCommissions } from "@/lib/commission";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !session ||
    (session.user.role !== "MASTER_ADMIN" && session.user.role !== "TEAM_MEMBER")
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId, amount, month, year, invoiceUrl, notes, items } = await req.json();
  if (!memberId || !month || !year)
    return NextResponse.json({ error: "Member, month and year required" }, { status: 400 });

  // Team members can only record sales for members assigned to them
  if (session.user.role === "TEAM_MEMBER") {
    const target = await prisma.user.findUnique({ where: { id: memberId }, select: { managedBy: true } });
    if (!target || target.managedBy !== session.user.id)
      return NextResponse.json({ error: "You can only record sales for your assigned members" }, { status: 403 });
  }

  // If products selected, compute amount from MRP; otherwise use manual amount
  let finalAmount = parseFloat(amount || "0");
  const saleItems: { productId: string; quantity: number; mrpAtSale: number }[] = [];

  if (items && items.length > 0) {
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) continue;
      const qty = parseInt(item.quantity) || 1;
      saleItems.push({ productId: product.id, quantity: qty, mrpAtSale: product.mrp });
      finalAmount += product.mrp * qty;
    }
    // If amount was also manually entered, use the larger value (manual overrides auto)
    if (parseFloat(amount || "0") > finalAmount) finalAmount = parseFloat(amount);
  }

  if (!finalAmount)
    return NextResponse.json({ error: "Amount or products required" }, { status: 400 });

  const sale = await prisma.sale.create({
    data: {
      memberId,
      enteredById: session.user.id,
      amount: finalAmount,
      month: parseInt(month),
      year: parseInt(year),
      invoiceUrl: invoiceUrl || null,
      notes: notes || null,
      ...(saleItems.length > 0 && {
        saleItems: { create: saleItems },
      }),
    },
    include: { member: { select: { name: true, memberId: true, rank: true } } },
  });

  // Async commission calculation (don't block the response)
  calculateCommissions(sale.id).catch(console.error);

  return NextResponse.json(sale, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const memberId = searchParams.get("memberId");
  const enteredById = searchParams.get("enteredById");

  // Distributors can only see their own sales
  const effectiveMemberId =
    session.user.role === "DISTRIBUTOR" ? session.user.id : memberId;

  const sales = await prisma.sale.findMany({
    where: {
      ...(month && year ? { month: parseInt(month), year: parseInt(year) } : {}),
      ...(effectiveMemberId ? { memberId: effectiveMemberId } : {}),
      ...(session.user.role !== "DISTRIBUTOR" &&
        (enteredById === "me"
          ? { enteredById: session.user.id }
          : enteredById
          ? { enteredById }
          : {})),
    },
    include: {
      member: { select: { name: true, memberId: true, rank: true } },
      enteredBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(sales);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Clean up commission records before deleting the sale
  await prisma.commissionRecord.deleteMany({ where: { saleId: id } });
  await prisma.sale.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
