import { NextRequest, NextResponse } from "next/server";
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
  const { name, dayOfWeek, startHour, startMin, endHour, endMin, playlistId } = await req.json() as {
    name: string; dayOfWeek: number; startHour: number; startMin?: number;
    endHour: number; endMin?: number; playlistId?: string;
  };
  if (!name || dayOfWeek === undefined || startHour === undefined || endHour === undefined) {
    return NextResponse.json({ error: "name, dayOfWeek, startHour, endHour required" }, { status: 400 });
  }
  const schedule = await db.scheduleBlock.create({
    data: { stationId, name, dayOfWeek, startHour, startMin: startMin ?? 0, endHour, endMin: endMin ?? 0, playlistId: playlistId ?? null },
    include: { playlist: { select: { id: true, name: true } } },
  });
  return NextResponse.json(schedule, { status: 201 });
}
