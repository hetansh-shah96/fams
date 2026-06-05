import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/purchase-orders");

  const { id } = await params;
  const [po, suppliers] = await Promise.all([
    prisma.purchaseOrder.findUnique({ where: { id } }),
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
  ]);
  if (!po) notFound();

  return <PurchaseOrderForm po={JSON.parse(JSON.stringify(po))} suppliers={suppliers} />;
}
