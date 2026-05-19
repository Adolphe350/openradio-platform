/**
 * GET /api/internal/next-track/[stationId]
 *
 * Called by Liquidsoap's request.dynamic to get the next track URI.
 * Implements schedule priority: if a schedule block is active now,
 * returns a track from that scheduled source. Otherwise returns an
 * AutoDJ track from the default playlist or all station tracks.
 *
 * Returns plain text: one line with the track URI (file path or URL).
 * Liquidsoap request.dynamic expects exactly this format.
 *
 * Auth: internal secret via x-poll-secret header or ?secret= query param.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ stationId: string }> };

function checkAuth(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-poll-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  return secret === env.METRICS_POLL_SECRET;
}

/**
 * Resolve active schedule blocks for the given station at the given time.
 * Uses the station's timezone to determine what's active.
 */
async function getActiveScheduleBlock(stationId: string, now: Date) {
  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { timezone: true },
  });
  if (!station) return null;

  const tz = station.timezone || "UTC";

  // Get the current local time in the station's timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = weekdayMap[get("weekday")] ?? 0;
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));
  const nowMin = hour * 60 + minute;

  // Find active schedule blocks that match right now
  const blocks = await db.scheduleBlock.findMany({
    where: { stationId, isActive: true },
    include: { playlist: { include: { tracks: { include: { track: true }, orderBy: { position: "asc" } } } } },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
  });

  // Priority: specific day blocks > every-day blocks
  // Among matches: TRACK/RECORDING/PODCAST > PLAYLIST > LIVE_SLOT > RANDOM_ALL
  const priorityMap: Record<string, number> = {
    TRACK: 0,
    RECORDING: 0,
    PODCAST_EPISODE: 0,
    PLAYLIST: 1,
    LIVE_SLOT: 2,
    RANDOM_ALL: 9,
  };

  const matching = blocks
    .filter((b) => {
      const matchesDay = b.dayOfWeek === -1 || b.dayOfWeek === dow;
      const startMin = b.startHour * 60 + b.startMin;
      const endMin = b.endHour * 60 + b.endMin;
      const inWindow = nowMin >= startMin && nowMin < endMin;
      return matchesDay && inWindow;
    })
    .sort((a, b) => {
      // Prefer specific-day over every-day
      const dayPriority = (x: typeof a) => (x.dayOfWeek === -1 ? 1 : 0);
      const dp = dayPriority(a) - dayPriority(b);
      if (dp !== 0) return dp;
      // Then by source type priority
      return (priorityMap[a.sourceType] ?? 9) - (priorityMap[b.sourceType] ?? 9);
    });

  return matching[0] ?? null;
}

/**
 * Get a random track from a playlist
 */
function getRandomTrackFromPlaylist(
  playlist: { tracks: Array<{ track: { filePath: string | null; fileUrl: string | null } }> },
): string | null {
  const validTracks = playlist.tracks.filter(
    (pt) => pt.track.filePath || pt.track.fileUrl,
  );
  if (validTracks.length === 0) return null;
  const idx = Math.floor(Math.random() * validTracks.length);
  const track = validTracks[idx].track;
  return track.filePath || track.fileUrl || null;
}

/**
 * Get a random track from all station tracks (AutoDJ fallback)
 */
async function getAutoDJTrack(stationId: string): Promise<string | null> {
  // First try the default playlist
  const defaultPlaylist = await db.playlist.findFirst({
    where: { stationId, isDefault: true },
    include: { tracks: { include: { track: true }, orderBy: { position: "asc" } } },
  });

  if (defaultPlaylist && defaultPlaylist.tracks.length > 0) {
    return getRandomTrackFromPlaylist(defaultPlaylist);
  }

  // Fallback: random from all station tracks
  const count = await db.track.count({ where: { stationId } });
  if (count === 0) return null;

  const skip = Math.floor(Math.random() * count);
  const tracks = await db.track.findMany({
    where: { stationId },
    select: { filePath: true, fileUrl: true },
    skip,
    take: 1,
  });

  const t = tracks[0];
  return t?.filePath || t?.fileUrl || null;
}

/**
 * Convert an app-level file path to the Liquidsoap container path
 */
function toLiqPath(path: string | null): string | null {
  if (!path) return null;
  // /app/uploads/xxx → /uploads/xxx (container mount)
  if (path.startsWith(`${env.UPLOAD_DIR}/`)) {
    return path.replace(env.UPLOAD_DIR, "/uploads");
  }
  // HTTP URLs stay as-is (Liquidsoap can fetch them)
  return path;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!checkAuth(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { stationId } = await params;

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true },
  });
  if (!station) {
    return new NextResponse("", { status: 404 });
  }

  const now = new Date();
  const activeBlock = await getActiveScheduleBlock(stationId, now);

  let trackPath: string | null = null;

  if (activeBlock && activeBlock.sourceType !== "RANDOM_ALL" && activeBlock.sourceType !== "LIVE_SLOT") {
    // Schedule is active — serve from scheduled source
    if (activeBlock.sourceType === "PLAYLIST" && activeBlock.playlist) {
      trackPath = getRandomTrackFromPlaylist(activeBlock.playlist);
    } else if (
      activeBlock.sourceType === "TRACK" ||
      activeBlock.sourceType === "RECORDING" ||
      activeBlock.sourceType === "PODCAST_EPISODE"
    ) {
      // Single source — look up the file
      if (activeBlock.sourceId) {
        if (activeBlock.sourceType === "TRACK") {
          const track = await db.track.findUnique({
            where: { id: activeBlock.sourceId },
            select: { filePath: true, fileUrl: true },
          });
          trackPath = track?.filePath || track?.fileUrl || null;
        } else if (activeBlock.sourceType === "PODCAST_EPISODE") {
          const ep = await db.episode.findUnique({
            where: { id: activeBlock.sourceId },
            select: { filePath: true, fileUrl: true },
          });
          trackPath = ep?.filePath || ep?.fileUrl || null;
        } else if (activeBlock.sourceType === "RECORDING") {
          const rec = await db.recording.findUnique({
            where: { id: activeBlock.sourceId },
            select: { filePath: true, fileUrl: true },
          });
          trackPath = rec?.filePath || rec?.fileUrl || null;
        }
      }
    }
  }

  // Fallback to AutoDJ if no schedule or schedule source unavailable
  if (!trackPath) {
    trackPath = await getAutoDJTrack(stationId);
  }

  const liqPath = toLiqPath(trackPath);

  if (!liqPath) {
    // Return empty — Liquidsoap will retry after a delay
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Return the track URI for Liquidsoap
  return new NextResponse(liqPath + "\n", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
