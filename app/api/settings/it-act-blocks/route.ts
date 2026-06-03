import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocks = await prisma.itActBlock.findMany({ orderBy: { rate: "asc" } });
  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { code, name, rate, description } = await req.json();
  if (!code || !name || rate == null) return NextResponse.json({ error: "code, name, rate required" }, { status: 400 });
  const block = await prisma.itActBlock.create({ data: { code, name, rate: Number(rate), description: description ?? null } });
  return NextResponse.json(block, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id, ...data } = await req.json();
  const block = await prisma.itActBlock.update({ where: { id }, data });
  return NextResponse.json(block);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await req.json();
  const count = await prisma.asset.count({ where: { itActBlockId: id } });
  if (count > 0) {
    return NextResponse.json({ error: `Cannot delete — ${count} asset${count > 1 ? "s use" : " uses"} this block.` }, { status: 409 });
  }
  await prisma.itActBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
