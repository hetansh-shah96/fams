import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CompanyClient } from "@/components/settings/company-client";

export default async function CompanyPage() {
  const session = await auth();
  if (session!.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return <CompanyClient />;
}
