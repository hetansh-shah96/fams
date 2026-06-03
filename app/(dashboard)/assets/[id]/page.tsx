import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AssetDetailClient } from "@/components/assets/asset-detail-client";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: { select: { name: true, group: true, usefulLifeCompaniesAct: true, depreciationMethod: true, customFields: true } },
      itActBlock: { select: { name: true, rate: true } },
      currentLocation: true,
      currentDepartment: true,
      assignedUser: { select: { id: true, name: true, email: true } },
      supplier: true,
      createdBy: { select: { name: true } },
      allocations: {
        orderBy: { createdAt: "desc" },
        include: {
          toLocation: { select: { name: true } },
          fromLocation: { select: { name: true } },
          toDepartment: { select: { name: true } },
          toUser: { select: { name: true } },
          transferredBy: { select: { name: true } },
        },
      },
      depreciation: { orderBy: { financialYear: "desc" } },
      maintenance: {
        orderBy: { serviceDate: "desc" },
        include: { createdBy: { select: { name: true } } },
      },
    },
  });

  if (!asset) notFound();

  return (
    <AssetDetailClient
      asset={JSON.parse(JSON.stringify(asset))}
      canEdit={["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)}
    />
  );
}
