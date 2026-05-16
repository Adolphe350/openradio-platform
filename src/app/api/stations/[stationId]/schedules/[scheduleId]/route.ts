import { NextRequest, NextResponse } from "next/server";
import { ScheduleSourceType } from "@prisma/client";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ stationId: string; scheduleId: string }> };

async function owned(stationId: string, userId: string) {
  return db.station.findFirst({ where: { id: stationId, ownerId: userId } });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId, scheduleId } = await params;
  if (!await owned(stationId, user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await db.scheduleBlock.findFirst({ where: { id: scheduleId, stationId } });
  if (!existing) return NextResponse.json({ error: "Schedule block not found" }, { status: 404 });

  const body = await req.json() as {
    name?: string;
    dayOfWeek?: number;
    startHour?: number;
    startMin?: number;
    endHour?: number;
    endMin?: number;
    sourceType?: ScheduleSourceType;
    sourceId?: string | null;
    playlistId?: string | null;
    color?: string | null;
    notes?: string | null;
    isActive?: boolean;
  };

  // Validate time range
  if (body.startHour !== undefined || body.endHour !== undefined) {
    const sh = body.startHour ?? existing.startHour;
    const sm = body.startMin ?? existing.startMin;
    const eh = body.endHour ?? existing.endHour;
    const em = body.endMin ?? existing.endMin;
    if (sh * 60 + sm >= eh * 60 + em) {
      return NextResponse.json({ error: "Start time must be before end time" }, { status: 400 });
    }
  }

  const updated = await db.scheduleBlock.update({
    where: { id: scheduleId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek }),
      ...(body.startHour !== undefined && { startHour: body.startHour }),
      ...(body.startMin !== undefined && { startMin: body.startMin }),
      ...(body.endHour !== undefined && { endHour: body.endHour }),
      ...(body.endMin !== undefined && { endMin: body.endMin }),
      ...(body.sourceType !== undefined && { sourceType: body.sourceType }),
      ...("sourceId" in body && { sourceId: body.sourceId ?? null }),
      ...("playlistId" in body && { playlistId: body.playlistId ?? null }),
      ...("color" in body && { color: body.color ?? null }),
      ...("notes" in body && { notes: body.notes ?? null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    include: { playlist: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId, scheduleId } = await params;
  if (!await owned(stationId, user.id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.scheduleBlock.deleteMany({ where: { id: scheduleId, stationId } });
  return NextResponse.json({ ok: true });
}
