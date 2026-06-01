import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { type, daysBeforeAlert, isActive, notifyEmails } = body;

  const config = await prisma.alertConfig.upsert({
    where: { type },
    create: { type, daysBeforeAlert, isActive, notifyEmails },
    update: { daysBeforeAlert, isActive, notifyEmails },
  });

  return NextResponse.json(config);
}
