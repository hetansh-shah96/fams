import { prisma } from "./prisma";

export async function generateAssetCode(categoryCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FAM-${categoryCode.toUpperCase()}-${year}-`;

  const lastAsset = await prisma.asset.findFirst({
    where: { assetCode: { startsWith: prefix } },
    orderBy: { assetCode: "desc" },
  });

  let seq = 1;
  if (lastAsset) {
    const parts = lastAsset.assetCode.split("-");
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}
