import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
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

  const { name, mrp, piDirect, piUpline } = await req.json();
  if (!name || !mrp)
    return NextResponse.json({ error: "Name and MRP are required" }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      name,
      mrp: parseFloat(mrp),
      piDirect: parseFloat(piDirect || "0"),
      piUpline: parseFloat(piUpline || "0"),
    },
  });
  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, mrp, piDirect, piUpline, isActive } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name     !== undefined && { name }),
      ...(mrp      !== undefined && { mrp: parseFloat(mrp) }),
      ...(piDirect !== undefined && { piDirect: parseFloat(piDirect) }),
      ...(piUpline !== undefined && { piUpline: parseFloat(piUpline) }),
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
