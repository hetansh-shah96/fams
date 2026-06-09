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
  const itActBlockId = sp.itActBlockId ?? "";
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
  if (itActBlockId) where.itActBlockId = itActBlockId;
  if (locationId && role !== "BRANCH_MANAGER") where.currentLocationId = locationId;

  const [assets, total, itActBlocks, locations, departments] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        itActBlock: true,
        currentLocation: true,
        currentDepartment: true,
        assignedUser: { select: { name: true } },
      },
    }),
    prisma.asset.count({ where }),
    prisma.itActBlock.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    prisma.location.findMany({ orderBy: { name: "asc" } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AssetListClient
      assets={JSON.parse(JSON.stringify(assets))}
      total={total}
      page={page}
      pageSize={pageSize}
      itActBlocks={itActBlocks}
      locations={locations}
      departments={departments}
      role={role}
    />
  );
}
