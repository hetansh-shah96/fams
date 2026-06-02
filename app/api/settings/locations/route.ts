import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const locations = await prisma.location.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true, code: true, name: true, address: true,
      city: true, state: true, pincode: true,
      companyId: true, isActive: true,
    },
  });
  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const body = await req.json();
    // Upsert by code so existing seed locations can be linked to a company
    const loc = await prisma.location.upsert({
      where: { code: body.code },
      update: {
        name: body.name,
        address: body.address ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        pincode: body.pincode ?? null,
        companyId: body.companyId ?? null,
      },
      create: {
        code: body.code,
        name: body.name,
        address: body.address ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        pincode: body.pincode ?? null,
        companyId: body.companyId ?? null,
      },
    });
    await createAuditLog(session.user.id, "CREATE", "Location", loc.id, null, body);
    return NextResponse.json(loc, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save branch";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    const counts = await prisma.location.findUnique({
      where: { id },
      select: { _count: { select: { assetsAtLocation: true, users: true, departments: true } } },
    });
    const total = (counts?._count.assetsAtLocation ?? 0) + (counts?._count.users ?? 0) + (counts?._count.departments ?? 0);
    if (total > 0) {
      return NextResponse.json(
        { error: `Cannot delete — this branch has ${counts!._count.assetsAtLocation} assets, ${counts!._count.users} users and ${counts!._count.departments} departments linked to it. Reassign them first.` },
        { status: 409 }
      );
    }
    await prisma.location.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { id, ...rest } = body;
    const loc = await prisma.location.update({
      where: { id },
      data: {
        code: rest.code,
        name: rest.name,
        address: rest.address ?? null,
        city: rest.city ?? null,
        state: rest.state ?? null,
        pincode: rest.pincode ?? null,
        companyId: rest.companyId ?? null,
      },
    });
    await createAuditLog(session.user.id, "UPDATE", "Location", id, null, rest);
    return NextResponse.json(loc);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update branch";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
