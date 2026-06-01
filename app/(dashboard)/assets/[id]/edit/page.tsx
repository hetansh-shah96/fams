import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { AssetForm } from "@/components/assets/asset-form";

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/assets");

  const { id } = await params;
  const [asset, categories, locations, departments, suppliers, users] = await Promise.all([
    prisma.asset.findUnique({ where: { id } }),
    prisma.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { location: true } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  if (!asset) notFound();

  return (
    <AssetForm
      categories={categories}
      locations={locations}
      departments={JSON.parse(JSON.stringify(departments))}
      suppliers={suppliers}
      users={users}
      asset={JSON.parse(JSON.stringify(asset))}
    />
  );
}
