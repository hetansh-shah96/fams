import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ScheduleSchema = z.object({
  serviceType: z.string().min(1),
  frequencyDays: z.coerce.number().int().min(1),
  nextDueDate: z.string().min(1),
  notes: z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { assetId: id },
    orderBy: { nextDueDate: "asc" },
  });
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role === "EMPLOYEE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id } = await params;
  const parsed = ScheduleSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { serviceType, frequencyDays, nextDueDate, notes } = parsed.data;
  const schedule = await prisma.maintenanceSchedule.upsert({
    where: { assetId_serviceType: { assetId: id, serviceType: serviceType as never } },
    create: { assetId: id, serviceType: serviceType as never, frequencyDays, nextDueDate: new Date(nextDueDate), notes: notes ?? null, isActive: true },
    update: { frequencyDays, nextDueDate: new Date(nextDueDate), notes: notes ?? null, isActive: true },
  });
  return NextResponse.json(schedule, { status: 201 });
}
