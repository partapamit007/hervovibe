import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, mrp, piRate, piUpline, biRate } = await req.json();
  if (!name || !mrp)
    return NextResponse.json({ error: "Name and MRP are required" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name,
      mrp:      parseFloat(mrp),
      piRate:   parseFloat(piRate   ?? "10"),
      piUpline: parseFloat(piUpline ?? "5"),
      biRate:   parseFloat(biRate   ?? "1"),
    },
  });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, mrp, piRate, piUpline, biRate, isActive } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name     !== undefined && { name }),
      ...(mrp      !== undefined && { mrp:      parseFloat(mrp) }),
      ...(piRate   !== undefined && { piRate:   parseFloat(piRate) }),
      ...(piUpline !== undefined && { piUpline: parseFloat(piUpline) }),
      ...(biRate   !== undefined && { biRate:   parseFloat(biRate) }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
