import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "@/components/settings/users-client";

export default async function UsersPage() {
  const session = await auth();
  if (!["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session!.user.role)) redirect("/dashboard");

  const [users, locations, departments] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      include: {
        location: { select: { name: true } },
        department: { select: { name: true } },
      },
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <UsersClient
      users={JSON.parse(JSON.stringify(users))}
      locations={locations}
      departments={departments}
      isSuperAdmin={session!.user.role === "SUPER_ADMIN"}
    />
  );
}
