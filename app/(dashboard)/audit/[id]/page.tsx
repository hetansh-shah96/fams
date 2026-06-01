import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { AuditSessionClient } from "@/components/audit/audit-session-client";

export default async function AuditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const auditSession = await prisma.auditSession.findUnique({
    where: { id },
    include: {
      location: { select: { name: true } },
      conductedBy: { select: { name: true } },
      entries: {
        include: {
          asset: {
            select: { id: true, assetCode: true, name: true, category: { select: { name: true } }, currentLocation: { select: { name: true } } },
          },
          expectedLocation: { select: { name: true } },
          foundLocation: { select: { name: true } },
        },
      },
    },
  });

  if (!auditSession) notFound();

  return (
    <AuditSessionClient
      session={JSON.parse(JSON.stringify(auditSession))}
      userId={session!.user.id}
    />
  );
}
