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
      usefulLifeCompaniesAct: body.usefulLifeCompaniesAct ?? 5,
      itActBlockRate: body.itActBlockRate ?? 0.15,
      depreciationMethod: body.depreciationMethod ?? "SLM",
      assetClassDescription: body.assetClassDescription,
    },
  });
  return NextResponse.json(cat, { status: 201 });
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
