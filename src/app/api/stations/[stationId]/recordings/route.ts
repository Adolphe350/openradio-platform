import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { stationId } = await params;

  const station = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  const recordings = await db.recording.findMany({
    where: { stationId },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ recordings });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const { stationId } = await params;

  const station = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "start";

  if (action === "start") {
    // Check if there's already an active recording
    const active = await db.recording.findFirst({
      where: { stationId, status: "recording" },
    });
    if (active) {
      return NextResponse.json({ error: "Recording already in progress", recording: active }, { status: 409 });
    }
    const recording = await db.recording.create({
      data: { stationId, status: "recording" },
    });
    return NextResponse.json({ recording }, { status: 201 });
  }

  if (action === "stop") {
    const recording = await db.recording.findFirst({
      where: { stationId, status: "recording" },
      orderBy: { startedAt: "desc" },
    });
    if (!recording) {
      return NextResponse.json({ error: "No active recording found" }, { status: 404 });
    }
    const updated = await db.recording.update({
      where: { id: recording.id },
      data: { status: "done", endedAt: new Date() },
    });
    return NextResponse.json({ recording: updated });
  }

  return NextResponse.json({ error: "Invalid action. Use start or stop." }, { status: 400 });
}
