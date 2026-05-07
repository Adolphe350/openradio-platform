import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ stationId: string; trackId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId, trackId } = await params;
  const body = await request.json();

  const track = await db.track.findFirst({
    where: {
      id: trackId,
      stationId,
      station: {
        ownerId: auth.user.id
      }
    }
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const artist = typeof body.artist === "string" ? body.artist.trim() : undefined;
  const album = typeof body.album === "string" ? body.album.trim() : undefined;
  const durationSec = body.durationSec;
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl.trim() : undefined;

  if (title !== undefined && title.length < 1) {
    return NextResponse.json({ error: "Track title cannot be empty" }, { status: 400 });
  }

  if (artist !== undefined && artist.length < 1) {
    return NextResponse.json({ error: "Track artist cannot be empty" }, { status: 400 });
  }

  if (durationSec !== undefined && (typeof durationSec !== "number" || !Number.isInteger(durationSec) || durationSec <= 0)) {
    return NextResponse.json({ error: "durationSec must be a positive integer" }, { status: 400 });
  }

  const data = {
    title,
    artist,
    album: album === undefined ? undefined : album || null,
    durationSec: durationSec === undefined ? undefined : durationSec,
    fileUrl: fileUrl === undefined ? undefined : fileUrl || null
  };

  if (Object.values(data).every((value) => value === undefined)) {
    return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
  }

  const updatedTrack = await db.track.update({
    where: { id: track.id },
    data
  });

  return NextResponse.json({ track: updatedTrack });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ stationId: string; trackId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId, trackId } = await params;

  const track = await db.track.findFirst({
    where: {
      id: trackId,
      stationId,
      station: {
        ownerId: auth.user.id
      }
    }
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  await db.track.delete({ where: { id: track.id } });

  return NextResponse.json({ success: true });
}
