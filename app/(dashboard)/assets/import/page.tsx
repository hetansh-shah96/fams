import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BulkImportClient } from "@/components/assets/bulk-import-client";

export default async function BulkImportPage() {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/assets");

  const [categories, locations, departments] = await Promise.all([
    prisma.assetCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <BulkImportClient
      categories={categories}
      locations={locations}
      departments={departments}
    />
  );
}
