import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId } = await params;

  const station = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const tracks = await db.track.findMany({
    where: { stationId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ tracks });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId } = await params;

  const station = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const body = await request.json();

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const artist = typeof body.artist === "string" ? body.artist.trim() : "";

  if (!title || !artist) {
    return NextResponse.json({ error: "Track title and artist are required" }, { status: 400 });
  }

  const track = await db.track.create({
    data: {
      stationId,
      createdByUserId: auth.user.id,
      title,
      artist,
      album: typeof body.album === "string" ? body.album.trim() || null : null,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : null,
      fileUrl: typeof body.fileUrl === "string" ? body.fileUrl.trim() || null : null
    }
  });

  return NextResponse.json({ track }, { status: 201 });
}
