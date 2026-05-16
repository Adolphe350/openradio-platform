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

  const schedules: ScheduleEntry[] = station.schedules.map((s) => ({
    name: s.name,
    dayOfWeek: s.dayOfWeek,
    startHour: s.startHour,
    startMin: s.startMin,
    endHour: s.endHour,
    endMin: s.endMin,
    sourceType: s.sourceType as ScheduleEntry["sourceType"],
    sourceId: s.sourceId,
    playlistId: s.playlistId,
  }));

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

  // all_tracks.m3u — every track in the station (for default AutoDJ rotation)
  const allTracks = await db.track.findMany({
    where: { stationId },
    select: { filePath: true, fileUrl: true },
  });
  const allTrackLines = allTracks
    .map((t) => toLiquidsoapPath(t.filePath ?? t.fileUrl))
    .filter(Boolean);
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
