import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER", "DEPT_HEAD"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { assetId, toLocationId, toDepartmentId, toUserId, notes, transferDate } = body;

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const allocation = await prisma.assetAllocation.create({
    data: {
      assetId,
      fromLocationId: asset.currentLocationId,
      toLocationId,
      fromDepartmentId: asset.currentDepartmentId,
      toDepartmentId,
      fromUserId: asset.assignedUserId,
      toUserId: toUserId || null,
      transferDate: new Date(transferDate),
      transferredByUserId: session.user.id,
      notes,
      status: "COMPLETED",
      receiverAcknowledged: false,
    },
  });

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      currentLocationId: toLocationId,
      currentDepartmentId: toDepartmentId,
      assignedUserId: toUserId || null,
      status: "ACTIVE",
    },
  });

  await createAuditLog(session.user.id, "TRANSFER", "Asset", assetId, { location: asset.currentLocationId }, { location: toLocationId });

  return NextResponse.json(allocation, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = Number(new URL(req.url).searchParams.get("page") ?? 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (session.user.role === "BRANCH_MANAGER" && session.user.locationId) {
    where.toLocationId = session.user.locationId;
  }

  const [items, total] = await Promise.all([
    prisma.assetAllocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        asset: { select: { assetCode: true, name: true } },
        toLocation: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toDepartment: { select: { name: true } },
        toUser: { select: { name: true } },
        transferredBy: { select: { name: true } },
      },
    }),
    prisma.assetAllocation.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}
