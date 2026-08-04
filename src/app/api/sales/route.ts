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
  let finalAmount = 0;
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
    // Manual override only if explicitly higher than computed product total
    if (parseFloat(amount || "0") > finalAmount) finalAmount = parseFloat(amount);
  } else {
    finalAmount = parseFloat(amount || "0");
  }

  if (!finalAmount || finalAmount <= 0)
    return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });

  const monthInt = parseInt(month);
  const yearInt  = parseInt(year);
  if (monthInt < 1 || monthInt > 12 || yearInt < 2020 || yearInt > 2100)
    return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        memberId,
        enteredById: session.user.id,
        amount: finalAmount,
        month: monthInt,
        year: yearInt,
        invoiceUrl: invoiceUrl || null,
        notes: notes || null,
        ...(saleItems.length > 0 && {
          saleItems: { create: saleItems },
        }),
      },
      include: { member: { select: { name: true, memberId: true, rank: true } } },
    });

    // Decrement stock for each product in the sale
    for (const item of saleItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return created;
  });

  // Async commission calculation (don't block the response)
  calculateCommissions(sale.id).catch((err) => {
    console.error(`[Commission] Failed for sale ${sale.id}:`, err);
  });

  return NextResponse.json(sale, { status: 201 });
}

async function getDownlineIds(sponsorId: string): Promise<string[]> {
  // Prefetch all active users once, then walk tree in memory
  const all = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, sponsorId: true },
  });
  const childMap = new Map<string, string[]>();
  for (const u of all) {
    if (u.sponsorId) {
      if (!childMap.has(u.sponsorId)) childMap.set(u.sponsorId, []);
      childMap.get(u.sponsorId)!.push(u.id);
    }
  }
  const ids: string[] = [];
  const queue = [...(childMap.get(sponsorId) ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    ids.push(id);
    queue.push(...(childMap.get(id) ?? []));
  }
  return ids;
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

  let effectiveMemberId: string | null | undefined = memberId;

  if (session.user.role === "DISTRIBUTOR") {
    if (memberId && memberId !== session.user.id) {
      // Allow only if the requested member is in this distributor's downline
      const downlineIds = await getDownlineIds(session.user.id);
      if (!downlineIds.includes(memberId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      effectiveMemberId = memberId;
    } else {
      effectiveMemberId = session.user.id;
    }
  }

  const sales = await prisma.sale.findMany({
    where: {
      deletedAt: null,
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
      saleItems: { include: { product: { select: { id: true, name: true, mrp: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: parseInt(searchParams.get("limit") ?? "1000"),
    skip: parseInt(searchParams.get("offset") ?? "0"),
  });
  return NextResponse.json(sales);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Restore stock for each item before soft-deleting
    const items = await tx.saleItem.findMany({
      where: { saleId: id },
      select: { productId: true, quantity: true },
    });
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    await tx.sale.update({ where: { id }, data: { deletedAt: new Date() } });
  });

  return NextResponse.json({ ok: true });
}
