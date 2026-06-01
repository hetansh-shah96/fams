import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { id, ...data } = body;

  const company = id
    ? await prisma.company.update({ where: { id }, data })
    : await prisma.company.upsert({
        where: { code: data.code },
        create: data,
        update: data,
      });

  return NextResponse.json(company);
}
