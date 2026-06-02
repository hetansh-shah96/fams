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

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    const counts = await prisma.department.findUnique({
      where: { id },
      select: { _count: { select: { assetsInDept: true, users: true } } },
    });
    const total = (counts?._count.assetsInDept ?? 0) + (counts?._count.users ?? 0);
    if (total > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${counts!._count.assetsInDept} assets and ${counts!._count.users} users are linked to this department.` },
        { status: 409 }
      );
    }
    await prisma.department.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
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
