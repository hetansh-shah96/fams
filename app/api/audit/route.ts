import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { name, locationId } = await req.json();

  const assetCount = await prisma.asset.count({
    where: { currentLocationId: locationId, status: { not: "DISPOSED" } },
  });

  const auditSession = await prisma.auditSession.create({
    data: {
      name,
      locationId,
      conductedByUserId: session.user.id,
      totalAssets: assetCount,
    },
  });

  const assets = await prisma.asset.findMany({
    where: { currentLocationId: locationId, status: { not: "DISPOSED" } },
    select: { id: true, currentLocationId: true },
  });

  await prisma.auditEntry.createMany({
    data: assets.map((a) => ({
      auditSessionId: auditSession.id,
      assetId: a.id,
      expectedLocationId: a.currentLocationId,
      status: "MISSING" as const,
      scannedByUserId: session.user.id,
    })),
  });

  return NextResponse.json(auditSession, { status: 201 });
}
