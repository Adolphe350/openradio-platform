/**
 * Called server-side after any station change that affects the AutoDJ
 * (status update, schedule change, playlist change, track add/remove).
 * Writes the .liq file + .m3u playlist files to the shared volume.
 *
 * The Liquidsoap script uses a hard-cut time-based switch for scheduled blocks
 * and the static all_tracks.m3u for AutoDJ. Schedule resolution at runtime is
 * handled by /api/internal/sched-track/[stationId]/[blockId] per block.
 */

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateLiqScript, type LiqConfig } from "@/lib/liquidsoap";

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
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
      },
      playlists: {
        include: {
          tracks: { include: { track: true }, orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (!station) return;

  // Build schedule entries — blockId is required by the new hard-cut .liq generator
  const schedules = station.schedules.map((s) => ({
    blockId: s.id,
    name: s.name,
    dayOfWeek: s.dayOfWeek,
    startHour: s.startHour,
    startMin: s.startMin,
    endHour: s.endHour,
    endMin: s.endMin,
    sourceType: s.sourceType as "PLAYLIST" | "PODCAST_EPISODE" | "RECORDING" | "TRACK" | "RANDOM_ALL" | "LIVE_SLOT",
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
    appBaseUrl: env.LIQ_INTERNAL_APP_URL,
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

  // Per-playlist .m3u files (kept for the static fallback)
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

  // all_tracks.m3u — static fallback AutoDJ source
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
}
