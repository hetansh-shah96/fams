import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const loc = await prisma.location.create({
    data: {
      code: body.code,
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
    },
  });
  await createAuditLog(session.user.id, "CREATE", "Location", loc.id, null, body);
  return NextResponse.json(loc, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  const loc = await prisma.location.update({ where: { id }, data });
  await createAuditLog(session.user.id, "UPDATE", "Location", id, null, data);
  return NextResponse.json(loc);
}
