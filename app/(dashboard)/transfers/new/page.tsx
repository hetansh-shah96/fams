import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TransferForm } from "@/components/transfers/transfer-form";

export default async function NewTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const session = await auth();
  if (session!.user.role === "EMPLOYEE") redirect("/transfers");

  const sp = await searchParams;
  const [assets, locations, departments, users] = await Promise.all([
    prisma.asset.findMany({
      where: { status: { not: "DISPOSED" } },
      orderBy: { name: "asc" },
      select: { id: true, assetCode: true, name: true, currentLocationId: true, currentDepartmentId: true },
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { location: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
  ]);

  return (
    <TransferForm
      assets={JSON.parse(JSON.stringify(assets))}
      locations={locations}
      departments={JSON.parse(JSON.stringify(departments))}
      users={users}
      defaultAssetId={sp.assetId}
    />
  );
}
