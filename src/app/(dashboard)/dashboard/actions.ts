"use server";

import crypto from "crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeMountPath } from "@/lib/stream";
import { slugify } from "@/lib/slug";

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
  const streamDescription = valueAsString(formData, "streamDescription") || null;

  await ensureOwnedStation(stationId, user.id);

  await db.station.update({
    where: { id: stationId },
    data: {
      description,
      genre,
      streamDescription
    }
  });

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
