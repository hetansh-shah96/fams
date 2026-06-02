import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(companies);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await req.json();
    const branches = await prisma.location.count({ where: { companyId: id } });
    if (branches > 0) {
      return NextResponse.json(
        { error: `Cannot delete — ${branches} branch${branches > 1 ? "es are" : " is"} linked to this company. Remove branches first.` },
        { status: 409 }
      );
    }
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  const company = id
    ? await prisma.company.update({ where: { id }, data })
    : await prisma.company.create({ data });
  return NextResponse.json(company, { status: id ? 200 : 201 });
}
