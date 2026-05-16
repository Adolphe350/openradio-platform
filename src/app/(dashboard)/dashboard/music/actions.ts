"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateStationConfig } from "@/lib/generate-station-config";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function musicPath(stationId: string, query?: string) {
  const base = `/dashboard/music?stationId=${encodeURIComponent(stationId)}`;
  return query ? `${base}&${query}` : base;
}

async function ensureOwnedStation(stationId: string, userId: string) {
  const station = await db.station.findFirst({
    where: { id: stationId, ownerId: userId },
    select: { id: true },
  });

  if (!station) {
    throw new Error("Station not found");
  }
}

async function ensureOwnedTrack(trackId: string, stationId: string, userId: string) {
  const track = await db.track.findFirst({
    where: {
      id: trackId,
      stationId,
      station: { ownerId: userId },
    },
    select: { id: true },
  });

  if (!track) {
    throw new Error("Track not found");
  }
}

async function ensureOwnedPlaylist(playlistId: string, stationId: string, userId: string) {
  const playlist = await db.playlist.findFirst({
    where: {
      id: playlistId,
      stationId,
      station: { ownerId: userId },
    },
    select: { id: true, isDefault: true },
  });

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  return playlist;
}

export async function addMusicTrackAction(formData: FormData) {
  const user = await requireUser();
  const stationId = formValue(formData, "stationId");
  const title = formValue(formData, "title");
  const artist = formValue(formData, "artist");
  const album = formValue(formData, "album") || null;
  const fileUrl = formValue(formData, "fileUrl") || null;
  const durationRaw = formValue(formData, "durationSec");
  const durationSec = durationRaw ? Number(durationRaw) : null;

  if (!stationId) {
    redirect("/dashboard/music?error=Station+is+required");
  }

  await ensureOwnedStation(stationId, user.id);

  if (!title || !artist) {
    redirect(musicPath(stationId, "error=Title+and+artist+are+required"));
  }

  if (durationSec !== null && (!Number.isFinite(durationSec) || durationSec <= 0)) {
    redirect(musicPath(stationId, "error=Duration+must+be+a+positive+number"));
  }

  await db.track.create({
    data: {
      stationId,
      createdByUserId: user.id,
      title,
      artist,
      album,
      fileUrl,
      durationSec: durationSec ? Math.round(durationSec) : null,
    },
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath("/dashboard/music");
  revalidatePath(`/dashboard/stations/${stationId}`);
  redirect(musicPath(stationId, "success=track-added"));
}

export async function deleteMusicTrackAction(formData: FormData) {
  const user = await requireUser();
  const stationId = formValue(formData, "stationId");
  const trackId = formValue(formData, "trackId");

  if (!stationId || !trackId) {
    redirect("/dashboard/music?error=Station+and+track+are+required");
  }

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedTrack(trackId, stationId, user.id);

  await db.track.delete({ where: { id: trackId } });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath("/dashboard/music");
  revalidatePath(`/dashboard/stations/${stationId}`);
  redirect(musicPath(stationId, "success=track-deleted"));
}

export async function createMusicPlaylistAction(formData: FormData) {
  const user = await requireUser();
  const stationId = formValue(formData, "stationId");
  const name = formValue(formData, "name");
  const description = formValue(formData, "description") || null;

  if (!stationId) {
    redirect("/dashboard/music?error=Station+is+required");
  }

  await ensureOwnedStation(stationId, user.id);

  if (name.length < 2) {
    redirect(musicPath(stationId, "error=Playlist+name+must+be+at+least+2+characters"));
  }

  try {
    await db.playlist.create({
      data: {
        stationId,
        createdById: user.id,
        name,
        description,
      },
    });
  } catch {
    redirect(musicPath(stationId, "error=Playlist+name+already+exists"));
  }

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath("/dashboard/music");
  revalidatePath(`/dashboard/stations/${stationId}`);
  redirect(musicPath(stationId, "success=playlist-created"));
}

export async function deleteMusicPlaylistAction(formData: FormData) {
  const user = await requireUser();
  const stationId = formValue(formData, "stationId");
  const playlistId = formValue(formData, "playlistId");

  if (!stationId || !playlistId) {
    redirect("/dashboard/music?error=Station+and+playlist+are+required");
  }

  await ensureOwnedStation(stationId, user.id);
  const playlist = await ensureOwnedPlaylist(playlistId, stationId, user.id);

  if (playlist.isDefault) {
    redirect(musicPath(stationId, "error=Default+playlist+cannot+be+deleted"));
  }

  await db.playlist.delete({ where: { id: playlistId } });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath("/dashboard/music");
  revalidatePath(`/dashboard/stations/${stationId}`);
  redirect(musicPath(stationId, "success=playlist-deleted"));
}

export async function addTrackToPlaylistMusicAction(formData: FormData) {
  const user = await requireUser();
  const stationId = formValue(formData, "stationId");
  const playlistId = formValue(formData, "playlistId");
  const trackId = formValue(formData, "trackId");

  if (!stationId || !playlistId || !trackId) {
    redirect("/dashboard/music?error=Station,+playlist,+and+track+are+required");
  }

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedTrack(trackId, stationId, user.id);
  await ensureOwnedPlaylist(playlistId, stationId, user.id);

  const highestPosition = await db.playlistTrack.aggregate({
    where: { playlistId },
    _max: { position: true },
  });

  try {
    await db.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position: (highestPosition._max.position ?? 0) + 1,
      },
    });
  } catch {
    redirect(musicPath(stationId, "error=Track+already+exists+in+playlist"));
  }

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath("/dashboard/music");
  revalidatePath(`/dashboard/stations/${stationId}`);
  redirect(musicPath(stationId, "success=track-added-to-playlist"));
}

export async function removeTrackFromPlaylistMusicAction(formData: FormData) {
  const user = await requireUser();
  const stationId = formValue(formData, "stationId");
  const playlistId = formValue(formData, "playlistId");
  const playlistTrackId = formValue(formData, "playlistTrackId");

  if (!stationId || !playlistId || !playlistTrackId) {
    redirect("/dashboard/music?error=Missing+playlist+track+identifiers");
  }

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedPlaylist(playlistId, stationId, user.id);

  await db.playlistTrack.deleteMany({
    where: { id: playlistTrackId, playlistId },
  });

  const remaining = await db.playlistTrack.findMany({
    where: { playlistId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  if (remaining.length > 0) {
    await Promise.all(
      remaining.map((track, index) =>
        db.playlistTrack.update({
          where: { id: track.id },
          data: { position: index + 1 },
        }),
      ),
    );
  }

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath("/dashboard/music");
  revalidatePath(`/dashboard/stations/${stationId}`);
  redirect(musicPath(stationId, "success=playlist-track-removed"));
}
