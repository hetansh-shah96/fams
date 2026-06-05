import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AssetForm } from "@/components/assets/asset-form";

export default async function NewAssetPage() {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/assets");

  const [categories, itActBlocks, locations, departments, suppliers, purchaseOrders, users] = await Promise.all([
    prisma.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.itActBlock.findMany({ where: { isActive: true }, orderBy: { rate: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { location: true } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CLOSED" } }, orderBy: { poDate: "desc" }, include: { supplier: { select: { name: true } } } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  return (
    <AssetForm
      categories={categories}
      itActBlocks={itActBlocks}
      locations={locations}
      departments={JSON.parse(JSON.stringify(departments))}
      suppliers={suppliers}
      purchaseOrders={purchaseOrders}
      users={users}
    />
  );
}
