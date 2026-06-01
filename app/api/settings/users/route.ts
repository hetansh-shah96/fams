import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      location: { select: { name: true } },
      department: { select: { name: true } },
    },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const hashed = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: hashed,
      role: body.role,
      locationId: body.locationId || null,
      departmentId: body.departmentId || null,
    },
  });
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { id, password, ...data } = body;
  const updateData: Record<string, unknown> = { ...data };
  if (password) updateData.password = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({ where: { id }, data: updateData });
  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
