import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { PurchaseOrderDetail } from "@/components/purchase-orders/purchase-order-detail";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const [po, suppliers] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { name: true } },
        assets: {
          include: {
            category: { select: { name: true } },
            currentLocation: { select: { name: true } },
            currentDepartment: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
  ]);

  if (!po) notFound();

  return (
    <PurchaseOrderDetail
      po={JSON.parse(JSON.stringify(po))}
      suppliers={suppliers}
      canEdit={["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)}
    />
  );
}
