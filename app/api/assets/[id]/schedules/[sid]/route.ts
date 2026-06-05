import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  frequencyDays: z.coerce.number().int().min(1).optional(),
  nextDueDate: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { sid } = await params;
  const parsed = UpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const data = parsed.data;
  const schedule = await prisma.maintenanceSchedule.update({
    where: { id: sid },
    data: {
      ...(data.frequencyDays !== undefined ? { frequencyDays: data.frequencyDays } : {}),
      ...(data.nextDueDate ? { nextDueDate: new Date(data.nextDueDate) } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
  return NextResponse.json(schedule);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { sid } = await params;
  await prisma.maintenanceSchedule.delete({ where: { id: sid } });
  return new NextResponse(null, { status: 204 });
}
