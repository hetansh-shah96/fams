import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const BulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("TRANSFER"),
    assetIds: z.array(z.string()).min(1),
    toLocationId: z.string().min(1),
    toDepartmentId: z.string().min(1),
    toUserId: z.string().optional(),
    transferDate: z.string().min(1),
    notes: z.string().optional(),
  }),
  z.object({
    action: z.literal("STATUS_UPDATE"),
    assetIds: z.array(z.string()).min(1),
    status: z.enum(["PROCURED", "IN_TRANSIT", "ACTIVE", "IN_REPAIR", "IDLE", "RETIRED"]),
  }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER", "DEPT_HEAD"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = BulkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const assets = await prisma.asset.findMany({ where: { id: { in: data.assetIds } } });
  if (assets.length === 0) return NextResponse.json({ error: "No matching assets found" }, { status: 404 });

  if (data.action === "TRANSFER") {
    const { toLocationId, toDepartmentId, toUserId, transferDate, notes } = data;
    for (const asset of assets) {
      await prisma.$transaction([
        prisma.assetAllocation.create({
          data: {
            assetId: asset.id,
            fromLocationId: asset.currentLocationId,
            toLocationId,
            fromDepartmentId: asset.currentDepartmentId,
            toDepartmentId,
            fromUserId: asset.assignedUserId,
            toUserId: toUserId || null,
            transferDate: new Date(transferDate),
            transferredByUserId: session.user.id,
            notes: notes || null,
            status: "COMPLETED",
            receiverAcknowledged: false,
          },
        }),
        prisma.asset.update({
          where: { id: asset.id },
          data: {
            currentLocationId: toLocationId,
            currentDepartmentId: toDepartmentId,
            assignedUserId: toUserId || null,
            status: "ACTIVE",
          },
        }),
      ]);
      await createAuditLog(session.user.id, "TRANSFER", "Asset", asset.id, { location: asset.currentLocationId }, { location: toLocationId });
    }
    return NextResponse.json({ updated: assets.length }, { status: 200 });
  }

  const { status } = data;
  for (const asset of assets) {
    if (asset.status === "DISPOSED") continue;
    await prisma.asset.update({ where: { id: asset.id }, data: { status } });
    await createAuditLog(session.user.id, "STATUS_UPDATE", "Asset", asset.id, { status: asset.status }, { status });
  }
  return NextResponse.json({ updated: assets.length }, { status: 200 });
}
