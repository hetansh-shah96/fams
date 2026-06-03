import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: true,
      currentLocation: true,
      currentDepartment: true,
      assignedUser: { select: { id: true, name: true, email: true } },
      supplier: true,
      createdBy: { select: { name: true } },
      allocations: {
        orderBy: { createdAt: "desc" },
        include: {
          toLocation: { select: { name: true } },
          toDepartment: { select: { name: true } },
          toUser: { select: { name: true } },
          transferredBy: { select: { name: true } },
        },
      },
      depreciation: { orderBy: { financialYear: "desc" } },
      maintenance: { orderBy: { serviceDate: "desc" }, include: { createdBy: { select: { name: true } } } },
    },
  });

  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.asset.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      name: body.name,
      make: body.make,
      model: body.model,
      serialNumber: body.serialNumber,
      categoryId: body.categoryId,
      purchaseDate: new Date(body.purchaseDate),
      purchaseCost: body.purchaseCost,
      gstPaid: body.gstPaid ?? 0,
      invoiceNumber: body.invoiceNumber,
      residualValue: body.residualValue,
      status: body.status,
      currentLocationId: body.currentLocationId,
      currentDepartmentId: body.currentDepartmentId,
      assignedUserId: body.assignedUserId || null,
      supplierId: body.supplierId || null,
      description: body.description,
      warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
      insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
      pucExpiry: body.pucExpiry ? new Date(body.pucExpiry) : null,
      condition: body.condition,
      ipConfiguration: body.ipConfiguration,
      ...(body.customValues !== undefined ? { customValues: body.customValues } : {}),
      ...(body.assignedToType ? { assignedToType: body.assignedToType } : {}),
      itActBlockId: body.itActBlockId || null,
    },
  });

  await createAuditLog(session.user.id, "UPDATE", "Asset", id, existing, body);
  return NextResponse.json(asset);
}
