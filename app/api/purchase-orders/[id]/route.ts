import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  poNumber: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  poDate: z.string().optional(),
  expectedDelivery: z.string().nullable().optional(),
  totalAmount: z.coerce.number().min(0).optional(),
  status: z.enum(["DRAFT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: { select: { name: true } },
      assets: {
        include: {
          category: { select: { name: true } },
          currentLocation: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(po);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;
  const po = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...(data.poNumber ? { poNumber: data.poNumber } : {}),
      ...(data.supplierId ? { supplierId: data.supplierId } : {}),
      ...(data.poDate ? { poDate: new Date(data.poDate) } : {}),
      ...(data.expectedDelivery !== undefined ? { expectedDelivery: data.expectedDelivery ? new Date(data.expectedDelivery) : null } : {}),
      ...(data.totalAmount !== undefined ? { totalAmount: data.totalAmount } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });
  return NextResponse.json(po);
}
