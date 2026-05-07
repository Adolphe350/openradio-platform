import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ stationId: string }> };

async function owned(stationId: string, userId: string) {
  return db.station.findFirst({ where: { id: stationId, ownerId: userId } });
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? "100"), 500);
  const logs = await db.playLog.findMany({ where: { stationId }, orderBy: { playedAt: "desc" }, take: limit });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { title, artist, trackId, durationSec } = await req.json() as { title: string; artist: string; trackId?: string; durationSec?: number };
  if (!title || !artist) return NextResponse.json({ error: "title and artist required" }, { status: 400 });
  const log = await db.playLog.create({ data: { stationId, title, artist, trackId: trackId ?? null, durationSec: durationSec ?? null } });
  return NextResponse.json(log, { status: 201 });
}
