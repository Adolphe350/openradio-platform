import { NextRequest, NextResponse } from "next/server";
import { ScheduleSourceType } from "@prisma/client";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ stationId: string }> };

async function owned(stationId: string, userId: string) {
  return db.station.findFirst({ where: { id: stationId, ownerId: userId } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const schedules = await db.scheduleBlock.findMany({
    where: { stationId },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
    include: { playlist: { select: { id: true, name: true } } },
  });
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json() as {
    name: string;
    dayOfWeek: number;
    startHour: number;
    startMin?: number;
    endHour: number;
    endMin?: number;
    sourceType?: ScheduleSourceType;
    sourceId?: string;
    playlistId?: string;
    color?: string;
    notes?: string;
  };
  const { name, dayOfWeek, startHour, endHour } = body;
  if (!name || dayOfWeek === undefined || startHour === undefined || endHour === undefined) {
    return NextResponse.json({ error: "name, dayOfWeek, startHour, endHour required" }, { status: 400 });
  }
  const startMin = body.startMin ?? 0;
  const endMin = body.endMin ?? 0;
  if (startHour * 60 + startMin >= endHour * 60 + endMin) {
    return NextResponse.json({ error: "Start time must be before end time" }, { status: 400 });
  }
  const sourceType = body.sourceType ?? (body.playlistId ? ScheduleSourceType.PLAYLIST : ScheduleSourceType.RANDOM_ALL);
  const schedule = await db.scheduleBlock.create({
    data: {
      stationId,
      name,
      dayOfWeek,
      startHour,
      startMin,
      endHour,
      endMin,
      sourceType,
      sourceId: body.sourceId ?? null,
      playlistId: body.playlistId ?? null,
      color: body.color ?? null,
      notes: body.notes ?? null,
    },
    include: { playlist: { select: { id: true, name: true } } },
  });
  return NextResponse.json(schedule, { status: 201 });
}
