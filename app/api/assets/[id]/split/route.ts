import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateAssetCode } from "@/lib/asset-code";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const SplitSchema = z.object({
  splitDate: z.string().min(1),
  reason: z.string().min(1),
  children: z
    .array(
      z.object({
        name: z.string().min(1),
        purchaseCost: z.coerce.number().min(0),
        serialNumber: z.string().optional(),
      })
    )
    .min(2),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id }, include: { category: true, splitRecord: true } });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (asset.status === "DISPOSED") {
    return NextResponse.json({ error: "Cannot split a disposed asset" }, { status: 400 });
  }
  if (asset.splitRecord) {
    return NextResponse.json({ error: "Asset has already been split" }, { status: 400 });
  }

  const parsed = SplitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { splitDate, reason, children } = parsed.data;

  const childAssets = [];
  for (const child of children) {
    const assetCode = await generateAssetCode(asset.category.code);
    childAssets.push(
      await prisma.asset.create({
        data: {
          assetCode,
          assetTagNumber: assetCode,
          name: child.name,
          make: asset.make,
          model: asset.model,
          serialNumber: child.serialNumber || null,
          categoryId: asset.categoryId,
          itActBlockId: asset.itActBlockId,
          purchaseDate: asset.purchaseDate,
          purchaseCost: child.purchaseCost,
          gstPaid: 0,
          residualValue: 0,
          status: "ACTIVE",
          currentLocationId: asset.currentLocationId,
          currentDepartmentId: asset.currentDepartmentId,
          assignedUserId: asset.assignedUserId,
          assignedToType: asset.assignedToType,
          condition: asset.condition,
          supplierId: asset.supplierId,
          purchaseOrderId: asset.purchaseOrderId,
          splitFromId: asset.id,
          createdByUserId: session.user.id,
        },
      })
    );
  }

  await prisma.$transaction([
    prisma.asset.update({ where: { id }, data: { status: "RETIRED" } }),
    prisma.assetSplit.create({
      data: {
        parentAssetId: id,
        splitDate: new Date(splitDate),
        reason,
        childCount: children.length,
        approvedByUserId: session.user.id,
      },
    }),
  ]);

  await createAuditLog(
    session.user.id,
    "SPLIT",
    "Asset",
    id,
    { status: asset.status },
    { status: "RETIRED", childCount: children.length, childAssetCodes: childAssets.map((c) => c.assetCode) }
  );

  return NextResponse.json({ parent: id, children: childAssets }, { status: 201 });
}
