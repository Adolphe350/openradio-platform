"use server";

import crypto from "crypto";
import { StationStatus } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeMountPath } from "@/lib/stream";
import { slugify } from "@/lib/slug";
import { generateStationConfig } from "@/lib/generate-station-config";

function valueAsString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function ensureOwnedStation(stationId: string, userId: string) {
  const station = await db.station.findFirst({ where: { id: stationId, ownerId: userId } });

  if (!station) {
    throw new Error("Station not found");
  }

  return station;
}

async function ensureOwnedTrack(trackId: string, stationId: string, userId: string) {
  const track = await db.track.findFirst({
    where: {
      id: trackId,
      stationId,
      station: {
        ownerId: userId
      }
    }
  });

  if (!track) {
    throw new Error("Track not found");
  }

  return track;
}

async function ensureOwnedPlaylist(playlistId: string, stationId: string, userId: string) {
  const playlist = await db.playlist.findFirst({
    where: {
      id: playlistId,
      stationId,
      station: {
        ownerId: userId
      }
    }
  });

  if (!playlist) {
    throw new Error("Playlist not found");
  }

  return playlist;
}

async function generateUniqueStationSlug(name: string) {
  const base = slugify(name) || "new-station";
  let counter = 1;
  let candidate = base;

  while (true) {
    const exists = await db.station.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) {
      return candidate;
    }

    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

export async function createStationAction(formData: FormData) {
  const user = await requireUser();

  const name = valueAsString(formData, "name");
  const description = valueAsString(formData, "description") || null;
  const genre = valueAsString(formData, "genre") || null;
  const language = valueAsString(formData, "language") || "English";
  const timezone = valueAsString(formData, "timezone") || "UTC";
  const country = valueAsString(formData, "country") || null;
  const mountPathRaw = valueAsString(formData, "mountPath");

  if (name.length < 3) {
    redirect("/dashboard/stations/new?error=Station%20name%20must%20be%20at%20least%203%20characters");
  }

  const mountPath = normalizeMountPath(mountPathRaw || `/${slugify(name)}.mp3`);
  const slug = await generateUniqueStationSlug(name);

  const station = await db.station.create({
    data: {
      ownerId: user.id,
      name,
      slug,
      description,
      genre,
      language,
      timezone,
      country,
      mountPath,
      sourceUsername: "source",
      sourcePassword: crypto.randomBytes(12).toString("hex")
    }
  });

  await db.playlist.create({
    data: {
      stationId: station.id,
      createdById: user.id,
      name: "Main Rotation",
      description: "Default AutoDJ rotation",
      isDefault: true
    }
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/stations/${station.id}`);
}

export async function updateStationMetadataAction(formData: FormData) {
  const user = await requireUser();
  const stationId = valueAsString(formData, "stationId");
  const description = valueAsString(formData, "description") || null;
  const genre = valueAsString(formData, "genre") || null;
  const language = valueAsString(formData, "language") || "English";
  const country = valueAsString(formData, "country") || null;
  const streamDescription = valueAsString(formData, "streamDescription") || null;
  const logoUrl = valueAsString(formData, "logoUrl") || null;
  const websiteUrl = valueAsString(formData, "websiteUrl") || null;
  const facebookUrl = valueAsString(formData, "facebookUrl") || null;
  const twitterUrl = valueAsString(formData, "twitterUrl") || null;

  await ensureOwnedStation(stationId, user.id);

  await db.station.update({
    where: { id: stationId },
    data: {
      description,
      genre,
      language,
      country,
      streamDescription,
      logoUrl,
      websiteUrl,
      facebookUrl,
      twitterUrl
    }
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function updateStationStatusAction(formData: FormData) {
  const user = await requireUser();
  const stationId = valueAsString(formData, "stationId");
  const statusCandidate = valueAsString(formData, "status").toUpperCase();
  const status = Object.values(StationStatus).find((value) => value === statusCandidate);

  if (!status) {
    redirect(`/dashboard/stations/${stationId}?error=Invalid%20station%20status`);
  }

  await ensureOwnedStation(stationId, user.id);

  await db.station.update({
    where: { id: stationId },
    data: { status }
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function deleteStationAction(formData: FormData) {
  const user = await requireUser();
  const stationId = valueAsString(formData, "stationId");

  await ensureOwnedStation(stationId, user.id);

  await db.station.delete({ where: { id: stationId } });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createTrackAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const title = valueAsString(formData, "title");
  const artist = valueAsString(formData, "artist");
  const album = valueAsString(formData, "album") || null;
  const durationRaw = valueAsString(formData, "durationSec");
  const fileUrl = valueAsString(formData, "fileUrl") || null;

  if (title.length < 1 || artist.length < 1) {
    redirect(`/dashboard/stations/${stationId}?error=Track%20title%20and%20artist%20are%20required`);
  }

  await ensureOwnedStation(stationId, user.id);

  await db.track.create({
    data: {
      stationId,
      createdByUserId: user.id,
      title,
      artist,
      album,
      durationSec: durationRaw ? Number(durationRaw) : null,
      fileUrl
    }
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function updateTrackAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const trackId = valueAsString(formData, "trackId");
  const title = valueAsString(formData, "title");
  const artist = valueAsString(formData, "artist");
  const album = valueAsString(formData, "album") || null;
  const durationRaw = valueAsString(formData, "durationSec");
  const fileUrl = valueAsString(formData, "fileUrl") || null;

  if (title.length < 1 || artist.length < 1) {
    redirect(`/dashboard/stations/${stationId}?error=Track%20title%20and%20artist%20are%20required`);
  }

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedTrack(trackId, stationId, user.id);

  await db.track.update({
    where: { id: trackId },
    data: {
      title,
      artist,
      album,
      durationSec: durationRaw ? Number(durationRaw) : null,
      fileUrl
    }
  });

  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function deleteTrackAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const trackId = valueAsString(formData, "trackId");

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedTrack(trackId, stationId, user.id);

  await db.track.delete({ where: { id: trackId } });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function createPlaylistAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const name = valueAsString(formData, "name");
  const description = valueAsString(formData, "description") || null;

  await ensureOwnedStation(stationId, user.id);

  if (name.length < 2) {
    redirect(`/dashboard/stations/${stationId}?error=Playlist%20name%20must%20be%20at%20least%202%20characters`);
  }

  try {
    await db.playlist.create({
      data: {
        stationId,
        createdById: user.id,
        name,
        description
      }
    });
  } catch {
    redirect(`/dashboard/stations/${stationId}?error=Playlist%20name%20already%20exists`);
  }

  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function updatePlaylistAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const playlistId = valueAsString(formData, "playlistId");
  const name = valueAsString(formData, "name");
  const description = valueAsString(formData, "description") || null;

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedPlaylist(playlistId, stationId, user.id);

  if (name.length < 2) {
    redirect(`/dashboard/stations/${stationId}?error=Playlist%20name%20must%20be%20at%20least%202%20characters`);
  }

  try {
    await db.playlist.update({
      where: { id: playlistId },
      data: {
        name,
        description
      }
    });
  } catch {
    redirect(`/dashboard/stations/${stationId}?error=Playlist%20name%20already%20exists`);
  }

  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function deletePlaylistAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const playlistId = valueAsString(formData, "playlistId");

  await ensureOwnedStation(stationId, user.id);
  const playlist = await ensureOwnedPlaylist(playlistId, stationId, user.id);

  if (playlist.isDefault) {
    redirect(`/dashboard/stations/${stationId}?error=Default%20playlist%20cannot%20be%20deleted`);
  }

  const playlistCount = await db.playlist.count({
    where: { stationId }
  });

  if (playlistCount <= 1) {
    redirect(`/dashboard/stations/${stationId}?error=At%20least%20one%20playlist%20must%20remain`);
  }

  await db.playlist.delete({
    where: { id: playlistId }
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function setDefaultPlaylistAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const playlistId = valueAsString(formData, "playlistId");

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedPlaylist(playlistId, stationId, user.id);

  await db.$transaction([
    db.playlist.updateMany({
      where: { stationId, isDefault: true },
      data: { isDefault: false }
    }),
    db.playlist.update({
      where: { id: playlistId },
      data: { isDefault: true }
    })
  ]);

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function addTrackToPlaylistAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const playlistId = valueAsString(formData, "playlistId");
  const trackId = valueAsString(formData, "trackId");

  await ensureOwnedStation(stationId, user.id);

  const [playlist, track] = await Promise.all([
    db.playlist.findFirst({ where: { id: playlistId, stationId } }),
    db.track.findFirst({ where: { id: trackId, stationId } })
  ]);

  if (!playlist || !track) {
    redirect(`/dashboard/stations/${stationId}?error=Playlist%20or%20track%20not%20found`);
  }

  const highestPosition = await db.playlistTrack.aggregate({
    where: { playlistId },
    _max: { position: true }
  });

  try {
    await db.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position: (highestPosition._max.position ?? 0) + 1
      }
    });
  } catch {
    redirect(`/dashboard/stations/${stationId}?error=Track%20already%20exists%20in%20playlist`);
  }

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function movePlaylistTrackAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const playlistId = valueAsString(formData, "playlistId");
  const playlistTrackId = valueAsString(formData, "playlistTrackId");
  const direction = valueAsString(formData, "direction");

  await ensureOwnedStation(stationId, user.id);

  const tracks = await db.playlistTrack.findMany({
    where: { playlistId },
    orderBy: { position: "asc" }
  });

  const currentIndex = tracks.findIndex((item) => item.id === playlistTrackId);
  if (currentIndex === -1) {
    redirect(`/dashboard/stations/${stationId}?error=Track%20position%20not%20found`);
  }

  const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (swapIndex < 0 || swapIndex >= tracks.length) {
    return;
  }

  const current = tracks[currentIndex];
  const target = tracks[swapIndex];

  await db.$transaction([
    db.playlistTrack.update({ where: { id: current.id }, data: { position: target.position } }),
    db.playlistTrack.update({ where: { id: target.id }, data: { position: current.position } })
  ]);

  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function removePlaylistTrackAction(formData: FormData) {
  const user = await requireUser();

  const stationId = valueAsString(formData, "stationId");
  const playlistId = valueAsString(formData, "playlistId");
  const playlistTrackId = valueAsString(formData, "playlistTrackId");

  await ensureOwnedStation(stationId, user.id);
  await ensureOwnedPlaylist(playlistId, stationId, user.id);

  const playlistTrack = await db.playlistTrack.findFirst({
    where: {
      id: playlistTrackId,
      playlistId
    }
  });

  if (!playlistTrack) {
    redirect(`/dashboard/stations/${stationId}?error=Playlist%20track%20not%20found`);
  }

  await db.playlistTrack.delete({ where: { id: playlistTrack.id } });

  const remainingTracks = await db.playlistTrack.findMany({
    where: { playlistId },
    orderBy: { position: "asc" }
  });

  if (remainingTracks.length > 0) {
    await db.$transaction(
      remainingTracks.map((track, index) =>
        db.playlistTrack.update({ where: { id: track.id }, data: { position: index + 1 } })
      )
    );
  }

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}`);
}

export async function renameStationAction(formData: FormData) {
  const user = await requireUser();
  const stationId = valueAsString(formData, "stationId");
  const name = valueAsString(formData, "name");

  if (name.length < 3) {
    redirect(`/dashboard/stations/${stationId}?error=Station%20name%20must%20be%20at%20least%203%20characters`);
  }

  await ensureOwnedStation(stationId, user.id);

  const newSlug = await generateUniqueStationSlug(name);

  await db.station.update({
    where: { id: stationId },
    data: { name, slug: newSlug },
  });

  revalidatePath(`/dashboard/stations/${stationId}`);
}
