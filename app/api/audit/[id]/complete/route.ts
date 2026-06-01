import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const entries = await prisma.auditEntry.groupBy({
    by: ["status"],
    where: { auditSessionId: id },
    _count: true,
  });

  const counts = Object.fromEntries(entries.map((e) => [e.status, e._count]));

  const updated = await prisma.auditSession.update({
    where: { id },
    data: {
      status: "COMPLETED",
      endDate: new Date(),
      verified: counts["VERIFIED"] ?? 0,
      missing: counts["MISSING"] ?? 0,
      misplaced: counts["MISPLACED"] ?? 0,
    },
  });

  return NextResponse.json(updated);
}
