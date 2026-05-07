import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ playlistId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { playlistId } = await params;
  const body = await request.json();

  const trackId = typeof body.trackId === "string" ? body.trackId : "";
  if (!trackId) {
    return NextResponse.json({ error: "trackId is required" }, { status: 400 });
  }

  const playlist = await db.playlist.findUnique({
    where: { id: playlistId },
    include: {
      station: {
        select: {
          ownerId: true,
          id: true
        }
      }
    }
  });

  if (!playlist || playlist.station.ownerId !== auth.user.id) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  const track = await db.track.findFirst({ where: { id: trackId, stationId: playlist.station.id } });

  if (!track) {
    return NextResponse.json({ error: "Track not found for this station" }, { status: 404 });
  }

  const highestPosition = await db.playlistTrack.aggregate({
    where: { playlistId },
    _max: { position: true }
  });

  try {
    const playlistTrack = await db.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position: (highestPosition._max.position ?? 0) + 1
      }
    });

    return NextResponse.json({ playlistTrack }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Track already exists in playlist" }, { status: 409 });
  }
}
