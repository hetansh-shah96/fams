import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { assetId, serviceType, vendorName, vendorContact, serviceDate, nextDueDate, cost, remarks, odometer, clickCount } = body;

  const log = await prisma.maintenanceLog.create({
    data: {
      assetId,
      serviceType,
      vendorName,
      vendorContact,
      serviceDate: new Date(serviceDate),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      cost: cost ?? 0,
      remarks,
      odometer: odometer ?? null,
      clickCount: clickCount ?? null,
      createdByUserId: session.user.id,
    },
  });

  await createAuditLog(session.user.id, "MAINTENANCE", "Asset", assetId, null, { serviceType, serviceDate });
  return NextResponse.json(log, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("assetId");
  const upcoming = searchParams.get("upcoming");

  const where: Record<string, unknown> = {};
  if (assetId) where.assetId = assetId;
  if (upcoming) {
    const days = Number(upcoming);
    const future = new Date();
    future.setDate(future.getDate() + days);
    where.nextDueDate = { lte: future, gte: new Date() };
  }

  const logs = await prisma.maintenanceLog.findMany({
    where,
    orderBy: { serviceDate: "desc" },
    include: {
      asset: { select: { assetCode: true, name: true, currentLocation: { select: { name: true } } } },
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json(logs);
}
