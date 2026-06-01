import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuditClient } from "@/components/audit/audit-client";

export default async function AuditPage() {
  const session = await auth();

  const [sessions, locations] = await Promise.all([
    prisma.auditSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        location: { select: { name: true } },
        conductedBy: { select: { name: true } },
      },
    }),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AuditClient
      sessions={JSON.parse(JSON.stringify(sessions))}
      locations={locations}
      userId={session!.user.id}
      role={session!.user.role}
    />
  );
}
