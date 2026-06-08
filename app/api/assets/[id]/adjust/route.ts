import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const AdjustSchema = z.object({
  type: z.enum(["REVALUATION_UP", "REVALUATION_DOWN", "COST_CORRECTION", "PARTIAL_WRITE_OFF"]),
  adjustmentDate: z.string().min(1),
  adjustmentAmount: z.coerce.number(),
  reason: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  if (asset.status === "DISPOSED") {
    return NextResponse.json({ error: "Cannot adjust a disposed asset" }, { status: 400 });
  }

  const parsed = AdjustSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { type, adjustmentDate, adjustmentAmount, reason } = parsed.data;

  const previousCost = asset.purchaseCost;
  const signedAmount =
    type === "REVALUATION_DOWN" || type === "PARTIAL_WRITE_OFF"
      ? -Math.abs(adjustmentAmount)
      : Math.abs(adjustmentAmount);
  const newCost = Number(previousCost) + signedAmount;

  if (newCost < 0) {
    return NextResponse.json({ error: "Adjustment would result in a negative asset cost" }, { status: 422 });
  }

  const [, adjustment] = await prisma.$transaction([
    prisma.asset.update({
      where: { id },
      data: { purchaseCost: newCost },
    }),
    prisma.assetAdjustment.create({
      data: {
        assetId: id,
        type,
        adjustmentDate: new Date(adjustmentDate),
        previousCost,
        adjustmentAmount: signedAmount,
        newCost,
        reason,
        approvedByUserId: session.user.id,
      },
    }),
  ]);

  await createAuditLog(
    session.user.id,
    "ADJUST_VALUE",
    "Asset",
    id,
    { purchaseCost: previousCost },
    { purchaseCost: newCost, type, reason }
  );

  return NextResponse.json(adjustment, { status: 201 });
}
