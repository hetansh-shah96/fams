import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SupplierDetailClient } from "@/components/settings/supplier-detail-client";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      assets: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          assetCode: true,
          name: true,
          status: true,
          purchaseCost: true,
          purchaseDate: true,
          warrantyExpiry: true,
          category: { select: { name: true } },
        },
      },
      purchaseOrders: {
        orderBy: { poDate: "desc" },
        select: {
          id: true,
          poNumber: true,
          poDate: true,
          totalAmount: true,
          status: true,
        },
      },
    },
  });

  if (!supplier) notFound();

  return <SupplierDetailClient supplier={JSON.parse(JSON.stringify(supplier))} />;
}
