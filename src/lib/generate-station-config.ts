/**
 * Called server-side after any station change that affects the AutoDJ
 * (status update, schedule change, playlist change, track add/remove).
 * Writes the .liq file + .m3u playlist files to the shared volume.
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { ScheduleSourceType } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateLiqScript, type LiqConfig, type ScheduleEntry } from "@/lib/liquidsoap";

const LIQ_CONFIG_DIR = env.LIQ_CONFIG_DIR;

function toLiquidsoapPath(trackPath: string | null | undefined): string {
  if (!trackPath) return "";
  if (trackPath.startsWith(`${env.UPLOAD_DIR}/`)) {
    return trackPath.replace(env.UPLOAD_DIR, "/uploads");
  }
  return trackPath;
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hourValue = Number(get("hour"));
  return {
    weekday: weekdayMap[get("weekday")] ?? 0,
    hour: hourValue === 24 ? 0 : hourValue,
    minute: Number(get("minute")),
  };
}

function findUtcForLocalTime(timeZone: string, weekday: number, hour: number, minute: number, after?: Date): Date {
  const searchStart = after ? after.getTime() + 60_000 : Date.now() - 7 * 24 * 60 * 60_000;
  const searchEnd = searchStart + 15 * 24 * 60 * 60_000;
  const stepMs = 15 * 60_000;
  const alignedStart = Math.floor(searchStart / stepMs) * stepMs;

  for (let ts = alignedStart; ts <= searchEnd; ts += stepMs) {
    const date = new Date(ts);
    const parts = localParts(date, timeZone);
    if (parts.weekday === weekday && parts.hour === hour && parts.minute === minute) {
      return date;
    }
  }

  throw new Error(`Could not convert ${weekday} ${hour}:${minute} in ${timeZone} to UTC`);
}

function utcDay(date: Date): number {
  return date.getUTCDay();
}

function minutesSinceUtcMidnight(date: Date): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function splitUtcRange(base: ScheduleEntry, start: Date, end: Date): ScheduleEntry[] {
  const startDay = utcDay(start);
  const endDay = utcDay(end);
  const startMin = minutesSinceUtcMidnight(start);
  const endMin = minutesSinceUtcMidnight(end);

  const withTime = (dayOfWeek: number, fromMin: number, toMin: number): ScheduleEntry => ({
    ...base,
    dayOfWeek,
    startHour: Math.floor(fromMin / 60),
    startMin: fromMin % 60,
    endHour: Math.floor(toMin / 60),
    endMin: toMin % 60,
  });

  if (startDay === endDay && startMin < endMin) {
    return [withTime(startDay, startMin, endMin)];
  }

  return [
    withTime(startDay, startMin, 24 * 60),
    withTime(endDay, 0, endMin),
  ].filter((entry) => entry.startHour * 60 + entry.startMin < entry.endHour * 60 + entry.endMin);
}

function convertScheduleToUtc(schedule: ScheduleEntry, timeZone: string): ScheduleEntry[] {
  const localDays = schedule.dayOfWeek === -1 ? [0, 1, 2, 3, 4, 5, 6] : [schedule.dayOfWeek];

  return localDays.flatMap((localDay) => {
    const start = findUtcForLocalTime(timeZone, localDay, schedule.startHour, schedule.startMin);
    const endLocalDay = schedule.endHour === 24 ? (localDay + 1) % 7 : localDay;
    const endLocalHour = schedule.endHour === 24 ? 0 : schedule.endHour;
    const end = findUtcForLocalTime(timeZone, endLocalDay, endLocalHour, schedule.endMin, start);

    return splitUtcRange({ ...schedule, dayOfWeek: localDay }, start, end);
  });
}

export async function generateStationConfig(stationId: string): Promise<void> {
  const station = await db.station.findUnique({
    where: { id: stationId },
    include: {
      schedules: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
      },
      playlists: {
        include: {
          tracks: { include: { track: true }, orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!station) return;

  const schedules: ScheduleEntry[] = station.schedules.flatMap((s) =>
    convertScheduleToUtc({
      name: s.name,
      dayOfWeek: s.dayOfWeek,
      startHour: s.startHour,
      startMin: s.startMin,
      endHour: s.endHour,
      endMin: s.endMin,
      sourceType: s.sourceType as ScheduleEntry["sourceType"],
      sourceId: s.sourceId,
      playlistId: s.playlistId,
    }, station.timezone || "UTC")
  );

  const cfg: LiqConfig = {
    stationId: station.id,
    stationName: station.name,
    mountPath: station.mountPath,
    sourcePassword: station.sourcePassword,
    icecastOutputPassword: env.ICECAST_SOURCE_PASSWORD,
    icecastHost: env.STREAM_SOURCE_HOST,
    icecastPort: env.ICECAST_SOURCE_PORT,
    genre: station.genre ?? "Mixed",
    description: station.description ?? station.name,
    appBaseUrl: env.APP_BASE_URL,
    pollSecret: env.METRICS_POLL_SECRET,
    schedules,
    bitrate: 128,
  };

  const script = generateLiqScript(cfg);

  // Per-station directory for playlist .m3u files
  const stationDir = path.join(LIQ_CONFIG_DIR, stationId);
  await mkdir(stationDir, { recursive: true });

  // Main .liq script
  await writeFile(path.join(LIQ_CONFIG_DIR, `${stationId}.liq`), script, "utf8");

  // Per-playlist .m3u files
  for (const playlist of station.playlists) {
    const lines = playlist.tracks
      .map((pt) => toLiquidsoapPath(pt.track.filePath ?? pt.track.fileUrl))
      .filter(Boolean);
    await writeFile(
      path.join(stationDir, `${playlist.id}.m3u`),
      lines.join("\n") + "\n",
      "utf8"
    );
  }

  // all_tracks.m3u — default AutoDJ rotation source.
  // Prefer the playlist marked as default so the dashboard's "Use for Auto DJ"
  // control actually changes what plays outside scheduled blocks.
  // Fall back to every station track only if no default playlist is available.
  const defaultPlaylist = station.playlists.find((playlist) => playlist.isDefault) ?? null;
  const defaultPlaylistLines = defaultPlaylist
    ? defaultPlaylist.tracks
        .map((pt) => toLiquidsoapPath(pt.track.filePath ?? pt.track.fileUrl))
        .filter(Boolean)
    : [];

  const fallbackAllTracks = await db.track.findMany({
    where: { stationId },
    select: { filePath: true, fileUrl: true },
  });
  const allTrackLines = (defaultPlaylistLines.length > 0 ? defaultPlaylistLines : fallbackAllTracks
    .map((t) => toLiquidsoapPath(t.filePath ?? t.fileUrl))
    .filter(Boolean));
  await writeFile(
    path.join(stationDir, "all_tracks.m3u"),
    allTrackLines.join("\n") + "\n",
    "utf8"
  );

  // Per-source single-file .m3u files for PODCAST_EPISODE / RECORDING / TRACK schedule blocks
  const singleSourceBlocks = station.schedules.filter(
    (s) =>
      s.sourceId &&
      (s.sourceType === ScheduleSourceType.PODCAST_EPISODE ||
       s.sourceType === ScheduleSourceType.RECORDING ||
       s.sourceType === ScheduleSourceType.TRACK)
  );

  for (const block of singleSourceBlocks) {
    if (!block.sourceId) continue;
    let filePath: string | null = null;

    if (block.sourceType === ScheduleSourceType.PODCAST_EPISODE) {
      const ep = await db.episode.findUnique({
        where: { id: block.sourceId },
        select: { filePath: true, fileUrl: true },
      });
      filePath = toLiquidsoapPath(ep?.filePath ?? ep?.fileUrl) || null;
    } else if (block.sourceType === ScheduleSourceType.RECORDING) {
      const rec = await db.recording.findUnique({
        where: { id: block.sourceId },
        select: { filePath: true, fileUrl: true },
      });
      filePath = toLiquidsoapPath(rec?.filePath ?? rec?.fileUrl) || null;
    } else if (block.sourceType === ScheduleSourceType.TRACK) {
      const track = await db.track.findUnique({
        where: { id: block.sourceId },
        select: { filePath: true, fileUrl: true },
      });
      filePath = toLiquidsoapPath(track?.filePath ?? track?.fileUrl) || null;
    }

    if (filePath) {
      await writeFile(
        path.join(stationDir, `source_${block.sourceId}.m3u`),
        filePath + "\n",
        "utf8"
      );
    }
  }
}
