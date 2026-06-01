import { prisma } from "./prisma";

export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: object | null,
  newValues?: object | null
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ?? undefined,
      newValues: newValues ?? undefined,
    },
  });
}
