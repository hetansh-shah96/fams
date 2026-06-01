import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CompanyClient } from "@/components/settings/company-client";

export default async function CompanyPage() {
  const session = await auth();
  if (session!.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const company = await prisma.company.findFirst();
  return <CompanyClient company={JSON.parse(JSON.stringify(company ?? {}))} />;
}
