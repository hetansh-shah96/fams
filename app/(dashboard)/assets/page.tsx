import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetListClient } from "@/components/assets/asset-list-client";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const page = Number(sp.page ?? 1);
  const pageSize = 20;
  const search = sp.search ?? "";
  const status = sp.status ?? "";
  const categoryId = sp.categoryId ?? "";
  const locationId = sp.locationId ?? "";

  const role = session!.user.role;
  const userLocationId = session!.user.locationId;
  const userDeptId = session!.user.departmentId;

  const baseFilter: Record<string, unknown> = {};
  if (role === "BRANCH_MANAGER" && userLocationId) baseFilter.currentLocationId = userLocationId;
  if (role === "DEPT_HEAD" && userDeptId) baseFilter.currentDepartmentId = userDeptId;
  if (role === "EMPLOYEE") baseFilter.assignedUserId = session!.user.id;

  const where: Record<string, unknown> = { ...baseFilter };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { assetCode: { contains: search, mode: "insensitive" } },
      { serialNumber: { contains: search, mode: "insensitive" } },
      { assetTagNumber: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (locationId && role !== "BRANCH_MANAGER") where.currentLocationId = locationId;

  const [assets, total, categories, locations] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        currentLocation: true,
        currentDepartment: true,
        assignedUser: { select: { name: true } },
      },
    }),
    prisma.asset.count({ where }),
    prisma.assetCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AssetListClient
      assets={JSON.parse(JSON.stringify(assets))}
      total={total}
      page={page}
      pageSize={pageSize}
      categories={categories}
      locations={locations}
      role={role}
    />
  );
}
