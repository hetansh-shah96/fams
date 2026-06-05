import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateAssetCode } from "@/lib/asset-code";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  categoryId: z.string(),
  purchaseDate: z.string(),
  purchaseCost: z.number(),
  gstPaid: z.number().default(0),
  invoiceNumber: z.string().optional(),
  residualValue: z.number(),
  status: z.string().default("ACTIVE"),
  currentLocationId: z.string(),
  currentDepartmentId: z.string(),
  assignedUserId: z.string().optional(),
  supplierId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  description: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  pucExpiry: z.string().optional(),
  ipConfiguration: z.string().optional(),
  serverModel: z.string().optional(),
  condition: z.string().optional(),
  customValues: z.record(z.string(), z.string()).nullish(),
  assignedToType: z.enum(["USER", "OFFICE"]).optional(),
  itActBlockId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const category = await prisma.assetCategory.findUnique({ where: { id: data.categoryId } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 400 });

  const assetCode = await generateAssetCode(category.code);
  const assetTagNumber = assetCode;

  const asset = await prisma.asset.create({
    data: {
      assetCode,
      assetTagNumber,
      name: data.name,
      make: data.make,
      model: data.model,
      serialNumber: data.serialNumber,
      categoryId: data.categoryId,
      purchaseDate: new Date(data.purchaseDate),
      purchaseCost: data.purchaseCost,
      gstPaid: data.gstPaid,
      invoiceNumber: data.invoiceNumber,
      residualValue: data.residualValue,
      status: data.status as never,
      currentLocationId: data.currentLocationId,
      currentDepartmentId: data.currentDepartmentId,
      assignedUserId: data.assignedUserId || null,
      supplierId: data.supplierId || null,
      purchaseOrderId: data.purchaseOrderId || null,
      description: data.description,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
      pucExpiry: data.pucExpiry ? new Date(data.pucExpiry) : null,
      ipConfiguration: data.ipConfiguration,
      serverModel: data.serverModel,
      condition: data.condition ?? "NEW",
      ...(data.customValues ? { customValues: data.customValues } : {}),
      assignedToType: (data.assignedToType ?? "OFFICE") as never,
      itActBlockId: data.itActBlockId || null,
      createdByUserId: session.user.id,
    },
  });

  await createAuditLog(session.user.id, "CREATE", "Asset", asset.id, null, { assetCode, name: data.name });

  return NextResponse.json(asset, { status: 201 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { assetCode: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { category: true, currentLocation: true, currentDepartment: true },
    }),
    prisma.asset.count({ where }),
  ]);

  return NextResponse.json({ assets, total, page, pageSize });
}
