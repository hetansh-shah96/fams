import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateDepreciation, getNextFY, getAssetFirstFY, compareFY } from "@/lib/depreciation";
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

  let processedTarget = 0;
  let priorYearsAutoFilled = 0;
  const notApplicable: { assetCode: string; name: string }[] = [];

  for (const asset of assets) {
    const assetFirstFY = getAssetFirstFY(new Date(asset.purchaseDate));

    // Asset not yet purchased in the target FY — skip entirely
    if (compareFY(financialYear, assetFirstFY) < 0) {
      notApplicable.push({ assetCode: asset.assetCode, name: asset.name });
      continue;
    }

    // Walk every year from the asset's first FY up to the target FY, filling gaps
    let currentFY = assetFirstFY;
    let openingWDV = Number(asset.purchaseCost);

    while (compareFY(currentFY, financialYear) <= 0) {
      const existing = await prisma.depreciationRecord.findUnique({
        where: { assetId_financialYear: { assetId: asset.id, financialYear: currentFY } },
      });

      if (existing && compareFY(currentFY, financialYear) < 0) {
        // Prior year already calculated — use its closing WDV and move on
        openingWDV = Number(existing.companiesActClosingWDV);
        currentFY = getNextFY(currentFY);
        continue;
      }

      // Calculate this year (either a gap year or the target year)
      const result = calculateDepreciation({
        purchaseCost: Number(asset.purchaseCost),
        residualValue: Number(asset.residualValue),
        purchaseDate: new Date(asset.purchaseDate),
        usefulLifeCompaniesAct: asset.category.usefulLifeCompaniesAct,
        itActBlockRate: asset.category.itActBlockRate,
        depreciationMethod: asset.category.depreciationMethod,
        financialYear: currentFY,
        openingWDV,
      });

      await prisma.depreciationRecord.upsert({
        where: { assetId_financialYear: { assetId: asset.id, financialYear: currentFY } },
        create: {
          assetId: asset.id,
          financialYear: currentFY,
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

      if (compareFY(currentFY, financialYear) < 0) {
        priorYearsAutoFilled++;
      } else {
        processedTarget++;
        await createAuditLog(session.user.id, "DEPRECIATION", "Asset", asset.id, null, { financialYear });
      }

      openingWDV = result.companiesActClosingWDV;
      currentFY = getNextFY(currentFY);
    }
  }

  return NextResponse.json({
    processed: processedTarget,
    priorYearsAutoFilled,
    notApplicable: notApplicable.length,
    financialYear,
  });
}
