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

  const playlists = await db.playlist.findMany({
    where: { stationId },
    orderBy: { createdAt: "asc" },
    include: {
      tracks: {
        orderBy: { position: "asc" },
        include: {
          track: true
        }
      }
    }
  });

  return NextResponse.json({ playlists });
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
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (name.length < 2) {
    return NextResponse.json({ error: "Playlist name must be at least 2 characters" }, { status: 400 });
  }

  try {
    const playlist = await db.playlist.create({
      data: {
        stationId,
        createdById: auth.user.id,
        name,
        description: typeof body.description === "string" ? body.description.trim() || null : null
      }
    });

    return NextResponse.json({ playlist }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Playlist name already exists" }, { status: 409 });
  }
}
