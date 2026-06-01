import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransferListClient } from "@/components/transfers/transfer-list-client";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const pageSize = 20;

  const where: Record<string, unknown> = {};
  if (session!.user.role === "BRANCH_MANAGER" && session!.user.locationId) {
    where.toLocationId = session!.user.locationId;
  }

  const [items, total] = await Promise.all([
    prisma.assetAllocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        asset: { select: { assetCode: true, name: true } },
        toLocation: { select: { name: true } },
        fromLocation: { select: { name: true } },
        toDepartment: { select: { name: true } },
        toUser: { select: { name: true } },
        transferredBy: { select: { name: true } },
      },
    }),
    prisma.assetAllocation.count({ where }),
  ]);

  return (
    <TransferListClient
      items={JSON.parse(JSON.stringify(items))}
      total={total}
      page={page}
      pageSize={pageSize}
      role={session!.user.role}
    />
  );
}
