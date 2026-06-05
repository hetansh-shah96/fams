import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const DisposeSchema = z.object({
  method: z.enum(["SOLD", "SCRAPPED", "DONATED", "WRITTEN_OFF"]),
  disposalDate: z.string().min(1),
  saleValue: z.coerce.number().min(0).default(0),
  buyerName: z.string().optional(),
  remarks: z.string().optional(),
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
    return NextResponse.json({ error: "Asset is already disposed" }, { status: 400 });
  }

  const parsed = DisposeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { method, disposalDate, saleValue, buyerName, remarks } = parsed.data;

  const [, disposal] = await prisma.$transaction([
    prisma.asset.update({
      where: { id },
      data: { status: "DISPOSED" },
    }),
    prisma.assetDisposal.create({
      data: {
        assetId: id,
        method,
        disposalDate: new Date(disposalDate),
        saleValue,
        buyerName: buyerName || null,
        remarks: remarks || null,
        approvedByUserId: session.user.id,
      },
    }),
  ]);

  await createAuditLog(session.user.id, "DISPOSE", "Asset", id, { status: asset.status }, { status: "DISPOSED", method });
  return NextResponse.json(disposal, { status: 201 });
}
