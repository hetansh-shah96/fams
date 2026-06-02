import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const categories = await prisma.assetCategory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const cat = await prisma.assetCategory.create({
    data: {
      code: body.code,
      name: body.name,
      group: body.group ?? null,
      itActBlock: body.itActBlock ?? null,
      usefulLifeCompaniesAct: body.usefulLifeCompaniesAct ?? 5,
      itActBlockRate: body.itActBlockRate ?? 0.15,
      depreciationMethod: body.depreciationMethod ?? "SLM",
      assetClassDescription: body.assetClassDescription ?? null,
      isIntangible: body.isIntangible ?? false,
      customFields: body.customFields ?? null,
    },
  });
  return NextResponse.json(cat, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    const assetCount = await prisma.asset.count({ where: { categoryId: id } });
    if (assetCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${assetCount} asset${assetCount > 1 ? "s use" : " uses"} this category.` },
        { status: 409 }
      );
    }
    await prisma.assetCategory.delete({ where: { id } });
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
  const body = await req.json();
  const { id, ...data } = body;
  const cat = await prisma.assetCategory.update({ where: { id }, data });
  return NextResponse.json(cat);
}
