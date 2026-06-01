import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DepreciationClient } from "@/components/depreciation/depreciation-client";
import { getIndianFYList, getCurrentIndianFY } from "@/lib/depreciation";

export default async function DepreciationPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string; assetId?: string }>;
}) {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const selectedFY = sp.fy ?? getCurrentIndianFY();

  const [assets, records, categories] = await Promise.all([
    prisma.asset.findMany({
      where: { status: { not: "DISPOSED" } },
      orderBy: { assetCode: "asc" },
      select: {
        id: true,
        assetCode: true,
        name: true,
        purchaseDate: true,
        purchaseCost: true,
        residualValue: true,
        categoryId: true,
        category: { select: { name: true, usefulLifeCompaniesAct: true, itActBlockRate: true, depreciationMethod: true } },
      },
    }),
    prisma.depreciationRecord.findMany({
      where: { financialYear: selectedFY },
      include: { asset: { select: { assetCode: true, name: true } } },
      orderBy: { calculatedAt: "desc" },
    }),
    prisma.assetCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  const fyList = getIndianFYList();

  return (
    <DepreciationClient
      assets={JSON.parse(JSON.stringify(assets))}
      records={JSON.parse(JSON.stringify(records))}
      categories={categories}
      fyList={fyList}
      selectedFY={selectedFY}
      defaultAssetId={sp.assetId}
    />
  );
}
