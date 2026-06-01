import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const depts = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { location: { select: { name: true } } },
  });
  return NextResponse.json(depts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const dept = await prisma.department.create({
    data: {
      code: body.code,
      name: body.name,
      locationId: body.locationId,
      remark: body.remark,
    },
  });
  return NextResponse.json(dept, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  const dept = await prisma.department.update({ where: { id }, data });
  return NextResponse.json(dept);
}
