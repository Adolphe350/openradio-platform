"use server";

import { revalidatePath } from "next/cache";
import { ScheduleSourceType } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateStationConfig } from "@/lib/generate-station-config";

function val(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}

function num(fd: FormData, k: string, fallback = 0): number {
  const v = parseInt(val(fd, k), 10);
  return isNaN(v) ? fallback : v;
}

async function owned(stationId: string, userId: string) {
  const s = await db.station.findFirst({ where: { id: stationId, ownerId: userId } });
  if (!s) throw new Error("Station not found");
  return s;
}

/** Validate source type is a known enum value */
function parseSourceType(raw: string): ScheduleSourceType {
  const valid: ScheduleSourceType[] = [
    "PLAYLIST", "PODCAST_EPISODE", "RECORDING", "TRACK", "RANDOM_ALL", "LIVE_SLOT",
  ];
  return valid.includes(raw as ScheduleSourceType)
    ? (raw as ScheduleSourceType)
    : "RANDOM_ALL";
}

export async function createScheduleBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  await owned(stationId, user.id);

  const name = val(fd, "name");
  const dayOfWeek = num(fd, "dayOfWeek", -1);
  const startHour = num(fd, "startHour");
  const startMin = num(fd, "startMin");
  const endHour = num(fd, "endHour");
  const endMin = num(fd, "endMin");
  const sourceType = parseSourceType(val(fd, "sourceType") || "RANDOM_ALL");
  const rawSourceId = val(fd, "sourceId");
  const rawPlaylistId = val(fd, "playlistId");
  const color = val(fd, "color") || null;
  const notes = val(fd, "notes") || null;

  if (!name) throw new Error("Block name is required");
  if (startHour * 60 + startMin >= endHour * 60 + endMin) {
    throw new Error("Start time must be before end time");
  }

  // For PLAYLIST type, sourceId == playlistId
  const playlistId = sourceType === "PLAYLIST" ? (rawPlaylistId || rawSourceId || null) : null;
  const sourceId = sourceType !== "PLAYLIST" && sourceType !== "RANDOM_ALL" && sourceType !== "LIVE_SLOT"
    ? (rawSourceId || null)
    : null;

  await db.scheduleBlock.create({
    data: {
      stationId,
      name,
      dayOfWeek,
      startHour,
      startMin,
      endHour,
      endMin,
      sourceType,
      sourceId,
      playlistId,
      color,
      notes,
      isActive: true,
    },
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}/scheduler`);
}

export async function updateScheduleBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const blockId = val(fd, "blockId");
  await owned(stationId, user.id);

  const existing = await db.scheduleBlock.findFirst({ where: { id: blockId, stationId } });
  if (!existing) throw new Error("Schedule block not found");

  const name = val(fd, "name") || existing.name;
  const dayOfWeek = fd.has("dayOfWeek") ? num(fd, "dayOfWeek", existing.dayOfWeek) : existing.dayOfWeek;
  const startHour = fd.has("startHour") ? num(fd, "startHour") : existing.startHour;
  const startMin = fd.has("startMin") ? num(fd, "startMin") : existing.startMin;
  const endHour = fd.has("endHour") ? num(fd, "endHour") : existing.endHour;
  const endMin = fd.has("endMin") ? num(fd, "endMin") : existing.endMin;
  const sourceType = fd.has("sourceType") ? parseSourceType(val(fd, "sourceType")) : existing.sourceType;
  const rawSourceId = fd.has("sourceId") ? (val(fd, "sourceId") || null) : existing.sourceId;
  const rawPlaylistId = fd.has("playlistId") ? (val(fd, "playlistId") || null) : existing.playlistId;
  const color = fd.has("color") ? (val(fd, "color") || null) : existing.color;
  const notes = fd.has("notes") ? (val(fd, "notes") || null) : existing.notes;
  const isActive = fd.has("isActive") ? val(fd, "isActive") === "true" : existing.isActive;

  if (startHour * 60 + startMin >= endHour * 60 + endMin) {
    throw new Error("Start time must be before end time");
  }

  const playlistId = sourceType === "PLAYLIST" ? (rawPlaylistId || rawSourceId) : null;
  const sourceId = sourceType !== "PLAYLIST" && sourceType !== "RANDOM_ALL" && sourceType !== "LIVE_SLOT"
    ? rawSourceId
    : null;

  await db.scheduleBlock.update({
    where: { id: blockId },
    data: {
      name,
      dayOfWeek,
      startHour,
      startMin,
      endHour,
      endMin,
      sourceType,
      sourceId,
      playlistId,
      color,
      notes,
      isActive,
    },
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}/scheduler`);
}

export async function deleteScheduleBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const blockId = val(fd, "blockId");
  await owned(stationId, user.id);

  await db.scheduleBlock.deleteMany({ where: { id: blockId, stationId } });
  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}/scheduler`);
}

export async function toggleScheduleBlockAction(fd: FormData) {
  const user = await requireUser();
  const stationId = val(fd, "stationId");
  const blockId = val(fd, "blockId");
  const isActive = val(fd, "isActive") === "true";
  await owned(stationId, user.id);

  await db.scheduleBlock.updateMany({
    where: { id: blockId, stationId },
    data: { isActive: !isActive },
  });

  await generateStationConfig(stationId).catch(() => {});
  revalidatePath(`/dashboard/stations/${stationId}/scheduler`);
}
