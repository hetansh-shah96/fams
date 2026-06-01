import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation } from "@/lib/depreciation";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { financialYear, assetIds } = await req.json();
  if (!financialYear) return NextResponse.json({ error: "Financial year required" }, { status: 400 });

  const assets = await prisma.asset.findMany({
    where: assetIds?.length ? { id: { in: assetIds } } : { status: { not: "DISPOSED" } },
    include: { category: true },
  });

  const results = [];
  for (const asset of assets) {
    const existingRecord = await prisma.depreciationRecord.findUnique({
      where: { assetId_financialYear: { assetId: asset.id, financialYear } },
    });

    const openingWDV = existingRecord
      ? Number(existingRecord.companiesActClosingWDV)
      : Number(asset.purchaseCost);

    const result = calculateDepreciation({
      purchaseCost: Number(asset.purchaseCost),
      residualValue: Number(asset.residualValue),
      purchaseDate: new Date(asset.purchaseDate),
      usefulLifeCompaniesAct: asset.category.usefulLifeCompaniesAct,
      itActBlockRate: asset.category.itActBlockRate,
      depreciationMethod: asset.category.depreciationMethod,
      financialYear,
      openingWDV,
    });

    const record = await prisma.depreciationRecord.upsert({
      where: { assetId_financialYear: { assetId: asset.id, financialYear } },
      create: {
        assetId: asset.id,
        financialYear,
        openingWDV: result.openingWDV,
        companiesActDepreciation: result.companiesActDepreciation,
        companiesActClosingWDV: result.companiesActClosingWDV,
        itActDepreciation: result.itActDepreciation,
        itActClosingWDV: result.itActClosingWDV,
        putToUseDays: result.putToUseDays,
        halfYearRule: result.halfYearRule,
        calculatedByUserId: session.user.id,
      },
      update: {
        openingWDV: result.openingWDV,
        companiesActDepreciation: result.companiesActDepreciation,
        companiesActClosingWDV: result.companiesActClosingWDV,
        itActDepreciation: result.itActDepreciation,
        itActClosingWDV: result.itActClosingWDV,
        putToUseDays: result.putToUseDays,
        halfYearRule: result.halfYearRule,
        calculatedAt: new Date(),
        calculatedByUserId: session.user.id,
      },
    });

    results.push(record);
    await createAuditLog(session.user.id, "DEPRECIATION", "Asset", asset.id, null, { financialYear });
  }

  return NextResponse.json({ processed: results.length, financialYear });
}
