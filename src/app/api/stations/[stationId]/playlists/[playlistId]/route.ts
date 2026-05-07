import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ stationId: string; playlistId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId, playlistId } = await params;
  const body = await request.json();

  const playlist = await db.playlist.findFirst({
    where: {
      id: playlistId,
      stationId,
      station: {
        ownerId: auth.user.id
      }
    }
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const description = typeof body.description === "string" ? body.description.trim() : undefined;

  if (name !== undefined && name.length < 2) {
    return NextResponse.json({ error: "Playlist name must be at least 2 characters" }, { status: 400 });
  }

  const data = {
    name,
    description: description === undefined ? undefined : description || null
  };

  if (Object.values(data).every((value) => value === undefined)) {
    return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
  }

  try {
    const updatedPlaylist = await db.playlist.update({
      where: { id: playlist.id },
      data
    });

    return NextResponse.json({ playlist: updatedPlaylist });
  } catch {
    return NextResponse.json({ error: "Playlist name already exists" }, { status: 409 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ stationId: string; playlistId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId, playlistId } = await params;

  const playlist = await db.playlist.findFirst({
    where: {
      id: playlistId,
      stationId,
      station: {
        ownerId: auth.user.id
      }
    }
  });

  if (!playlist) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  if (playlist.isDefault) {
    return NextResponse.json({ error: "Default playlist cannot be deleted" }, { status: 400 });
  }

  const playlistCount = await db.playlist.count({
    where: {
      stationId
    }
  });

  if (playlistCount <= 1) {
    return NextResponse.json({ error: "At least one playlist must remain" }, { status: 400 });
  }

  await db.playlist.delete({ where: { id: playlist.id } });

  return NextResponse.json({ success: true });
}
