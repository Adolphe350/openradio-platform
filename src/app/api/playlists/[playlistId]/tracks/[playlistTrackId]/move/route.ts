import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  {
    params
  }: {
    params: Promise<{ playlistId: string; playlistTrackId: string }>;
  }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { playlistId, playlistTrackId } = await params;

  const body = await request.json();
  const direction = body.direction === "up" ? "up" : body.direction === "down" ? "down" : null;

  if (!direction) {
    return NextResponse.json({ error: "direction must be 'up' or 'down'" }, { status: 400 });
  }

  const playlist = await db.playlist.findUnique({
    where: { id: playlistId },
    include: {
      station: {
        select: {
          ownerId: true
        }
      }
    }
  });

  if (!playlist || playlist.station.ownerId !== auth.user.id) {
    return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
  }

  const tracks = await db.playlistTrack.findMany({
    where: { playlistId },
    orderBy: { position: "asc" }
  });

  const currentIndex = tracks.findIndex((item) => item.id === playlistTrackId);
  if (currentIndex === -1) {
    return NextResponse.json({ error: "Playlist track not found" }, { status: 404 });
  }

  const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (swapIndex < 0 || swapIndex >= tracks.length) {
    return NextResponse.json({ success: true, unchanged: true });
  }

  const current = tracks[currentIndex];
  const target = tracks[swapIndex];

  await db.$transaction([
    db.playlistTrack.update({ where: { id: current.id }, data: { position: target.position } }),
    db.playlistTrack.update({ where: { id: target.id }, data: { position: current.position } })
  ]);

  return NextResponse.json({ success: true });
}
