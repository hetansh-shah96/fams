import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  poNumber: z.string().min(1),
  supplierId: z.string().min(1),
  poDate: z.string().min(1),
  expectedDelivery: z.string().optional(),
  totalAmount: z.coerce.number().min(0),
  status: z.enum(["DRAFT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"]).default("DRAFT"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");

  const pos = await prisma.purchaseOrder.findMany({
    where: supplierId ? { supplierId } : undefined,
    orderBy: { poDate: "desc" },
    include: {
      supplier: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { assets: true } },
    },
  });
  return NextResponse.json(pos);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { poNumber, supplierId, poDate, expectedDelivery, totalAmount, status, notes } = parsed.data;
  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId,
      poDate: new Date(poDate),
      expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
      totalAmount,
      status,
      notes: notes || null,
      createdByUserId: session.user.id,
    },
    include: { supplier: { select: { name: true } } },
  });
  return NextResponse.json(po, { status: 201 });
}
