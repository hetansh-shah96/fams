import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/purchase-orders");

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return <PurchaseOrderForm suppliers={suppliers} />;
}
