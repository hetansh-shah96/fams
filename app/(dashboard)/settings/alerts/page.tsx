import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AlertConfigClient } from "@/components/settings/alert-config-client";

export default async function AlertsPage() {
  const session = await auth();
  if (session!.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const configs = await prisma.alertConfig.findMany({ orderBy: { type: "asc" } });

  const ALL_TYPES = ["AMC_EXPIRY", "INSURANCE_EXPIRY", "PUC_EXPIRY", "WARRANTY_EXPIRY", "SCHEDULED_SERVICE"] as const;
  const allConfigs = ALL_TYPES.map((type) => configs.find((c) => c.type === type) ?? {
    id: null, type, daysBeforeAlert: 15, isActive: true, notifyEmails: [],
  });

  return <AlertConfigClient configs={JSON.parse(JSON.stringify(allConfigs))} />;
}
