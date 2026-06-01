import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { entryId, status } = await req.json();

  const entry = await prisma.auditEntry.update({
    where: { id: entryId },
    data: { status, scannedAt: new Date(), scannedByUserId: session.user.id },
  });

  await prisma.auditSession.update({
    where: { id },
    data: {
      verified: { increment: status === "VERIFIED" ? 1 : 0 },
      missing: { decrement: 1 },
    },
  });

  return NextResponse.json(entry);
}
