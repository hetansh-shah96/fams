import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const session = await auth();
  if (session!.user.role === "EMPLOYEE") redirect("/maintenance");

  const sp = await searchParams;
  const assets = await prisma.asset.findMany({
    where: { status: { not: "DISPOSED" } },
    orderBy: { name: "asc" },
    select: { id: true, assetCode: true, name: true },
  });

  return <MaintenanceForm assets={assets} defaultAssetId={sp.assetId} />;
}
