/**
 * GET /api/internal/next-track/[stationId]
 *
 * Called by Liquidsoap's request.dynamic.list to get the next track URI.
 * Implements schedule priority: if a schedule block is active now,
 * returns a track from that scheduled source. Otherwise returns an
 * AutoDJ track from the default playlist or all station tracks.
 *
 * SCHEDULE LOGIC:
 *  - TRACK / PODCAST_EPISODE / RECORDING: plays the source ONCE per window,
 *    then falls back to AutoDJ for the rest of the window. Uses an in-memory
 *    latch (reset each time the window opens) to prevent the same track
 *    from looping endlessly throughout a long schedule block.
 *  - PLAYLIST: cycles through playlist tracks randomly (no per-window limit).
 *  - RANDOM_ALL / LIVE_SLOT: always use AutoDJ / live source.
 *
 * Returns plain text: one line with the track URI (file path or URL).
 * Liquidsoap request.dynamic.list expects exactly this format.
 *
 * Auth: internal secret via x-poll-secret header or ?secret= query param.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ stationId: string }> };

// ---------------------------------------------------------------------------
// In-memory schedule window dedup
//
// Prevents TRACK/PODCAST_EPISODE/RECORDING schedule blocks from looping.
// Each entry: stationId:blockId:windowKey → UTC ms when last served in window.
// Entries are cleaned up after 24 h to avoid unbounded growth.
// ---------------------------------------------------------------------------
const _schedServedAt = new Map<string, number>();

// Periodic cleanup — every hour, drop entries older than 24 h
const _cleanupTimer = setInterval(
  () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [k, v] of _schedServedAt) {
      if (v < cutoff) _schedServedAt.delete(k);
    }
  },
  60 * 60 * 1000,
);
// Don't keep the process alive just for cleanup
if (typeof _cleanupTimer.unref === "function") _cleanupTimer.unref();

type BlockRef = { id: string; dayOfWeek: number; startHour: number; startMin: number };

/** Build a stable key for one occurrence of a schedule window. */
function windowKey(stationId: string, b: BlockRef): string {
  return `${stationId}:${b.id}:${b.dayOfWeek}:${b.startHour}:${b.startMin}`;
}

/**
 * Returns true if the single-source block was already served in the current
 * window activation. `windowStartMs` is the approximate UTC timestamp when
 * the current window opened (computed from current time – minutes-into-window).
 */
function isAlreadyServedInWindow(stationId: string, block: BlockRef, windowStartMs: number): boolean {
  const lastServed = _schedServedAt.get(windowKey(stationId, block)) ?? 0;
  return lastServed >= windowStartMs;
}

function markServedInWindow(stationId: string, block: BlockRef): void {
  _schedServedAt.set(windowKey(stationId, block), Date.now());
}

/**
 * How many minutes past the window end we will still serve a single-source
 * block that was never played during its window (catch-up for missed content).
 *
 * Scenario: ads scheduled for 10:50–10:52, but a song is playing and only
 * ends at 10:53. Without catch-up the ads window has closed and the content
 * is skipped entirely. With catch-up it plays at 10:53 as the next track.
 */
const CATCHUP_MINUTES = 10;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function checkAuth(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-poll-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  return secret === env.METRICS_POLL_SECRET;
}

// ---------------------------------------------------------------------------
// Schedule resolution
// ---------------------------------------------------------------------------

/** DB shape of a schedule block with its playlist (if any). */
type ScheduleBlockWithPlaylist = Awaited<ReturnType<typeof fetchScheduleBlocks>>[number];

async function fetchScheduleBlocks(stationId: string) {
  return db.scheduleBlock.findMany({
    where: { stationId, isActive: true },
    include: {
      playlist: {
        include: {
          tracks: { include: { track: true }, orderBy: { position: "asc" } },
        },
      },
    },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
  });
}

type LocalTime = { dow: number; hour: number; minute: number; nowMin: number };

function getLocalTime(now: Date, tz: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  const dow = weekdayMap[get("weekday")] ?? 0;
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));
  return { dow, hour, minute, nowMin: hour * 60 + minute };
}

/** Source-type priority: lower = higher priority */
const SOURCE_PRIORITY: Record<string, number> = {
  TRACK: 0,
  RECORDING: 0,
  PODCAST_EPISODE: 0,
  PLAYLIST: 1,
  LIVE_SLOT: 2,
  RANDOM_ALL: 9,
};

/** Returns true for source types that play a single file (not a rotating list). */
function isSingleSourceType(sourceType: string): boolean {
  return sourceType === "TRACK" || sourceType === "PODCAST_EPISODE" || sourceType === "RECORDING";
}

/**
 * Find the best schedule block for the given local time.
 *
 * Includes a catch-up window: if a single-source block's time window just
 * closed (within CATCHUP_MINUTES) AND the block was never served during that
 * window, it is still returned so the content plays at the next track
 * boundary instead of being silently skipped.
 *
 * Example: ads at 10:50, song playing, song ends 10:53 → ads play at 10:53.
 */
function getActiveBlock(
  blocks: ScheduleBlockWithPlaylist[],
  { dow, nowMin }: LocalTime,
  stationId: string,
): ScheduleBlockWithPlaylist | null {
  type Candidate = { block: ScheduleBlockWithPlaylist; isCatchup: boolean; windowStartMs: number };
  const candidates: Candidate[] = [];

  for (const b of blocks) {
    const matchesDay = b.dayOfWeek === -1 || b.dayOfWeek === dow;
    if (!matchesDay) continue;

    const startMin = b.startHour * 60 + b.startMin;
    const endMin = b.endHour * 60 + b.endMin;
    const minutesIntoWindow = nowMin - startMin;
    const windowStartMs = Date.now() - Math.max(0, minutesIntoWindow) * 60 * 1000;

    if (nowMin >= startMin && nowMin < endMin) {
      // Block is actively in its time window
      candidates.push({ block: b, isCatchup: false, windowStartMs });
    } else if (
      isSingleSourceType(b.sourceType) &&
      nowMin >= endMin &&
      nowMin < endMin + CATCHUP_MINUTES
    ) {
      // Block's window just closed but it's within the catch-up grace period.
      // Only catch up if the content was never served in this window.
      const approxWindowStartMs = Date.now() - (nowMin - startMin) * 60 * 1000;
      if (!isAlreadyServedInWindow(stationId, b, approxWindowStartMs)) {
        candidates.push({ block: b, isCatchup: true, windowStartMs: approxWindowStartMs });
      }
    }
  }

  if (candidates.length === 0) return null;

  // Sort: active window > catchup, then specific-day > every-day, then source type priority
  candidates.sort((a, b) => {
    if (a.isCatchup !== b.isCatchup) return a.isCatchup ? 1 : -1;
    const dayPriority = (x: Candidate) => (x.block.dayOfWeek === -1 ? 1 : 0);
    const dp = dayPriority(a) - dayPriority(b);
    if (dp !== 0) return dp;
    return (SOURCE_PRIORITY[a.block.sourceType] ?? 9) - (SOURCE_PRIORITY[b.block.sourceType] ?? 9);
  });

  return candidates[0].block;
}

// ---------------------------------------------------------------------------
// Track resolution helpers
// ---------------------------------------------------------------------------

function getRandomTrackFromPlaylist(
  playlist: ScheduleBlockWithPlaylist["playlist"],
): string | null {
  if (!playlist) return null;
  const valid = playlist.tracks.filter(
    (pt) => pt.track.filePath || pt.track.fileUrl,
  );
  if (valid.length === 0) return null;
  const pt = valid[Math.floor(Math.random() * valid.length)];
  return pt.track.filePath || pt.track.fileUrl || null;
}

async function getSingleSourcePath(block: ScheduleBlockWithPlaylist): Promise<string | null> {
  if (!block.sourceId) return null;

  if (block.sourceType === "TRACK") {
    const t = await db.track.findUnique({
      where: { id: block.sourceId },
      select: { filePath: true, fileUrl: true },
    });
    return t?.filePath || t?.fileUrl || null;
  }

  if (block.sourceType === "PODCAST_EPISODE") {
    const ep = await db.episode.findUnique({
      where: { id: block.sourceId },
      select: { filePath: true, fileUrl: true },
    });
    return ep?.filePath || ep?.fileUrl || null;
  }

  if (block.sourceType === "RECORDING") {
    const rec = await db.recording.findUnique({
      where: { id: block.sourceId },
      select: { filePath: true, fileUrl: true },
    });
    return rec?.filePath || rec?.fileUrl || null;
  }

  return null;
}

async function getAutoDJTrack(stationId: string): Promise<string | null> {
  // Try the default playlist first
  const defaultPlaylist = await db.playlist.findFirst({
    where: { stationId, isDefault: true },
    include: {
      tracks: { include: { track: true }, orderBy: { position: "asc" } },
    },
  });

  if (defaultPlaylist && defaultPlaylist.tracks.length > 0) {
    const valid = defaultPlaylist.tracks.filter(
      (pt) => pt.track.filePath || pt.track.fileUrl,
    );
    if (valid.length > 0) {
      const pt = valid[Math.floor(Math.random() * valid.length)];
      return pt.track.filePath || pt.track.fileUrl || null;
    }
  }

  // Fallback: random track from all station tracks
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

function toLiqPath(p: string | null): string | null {
  if (!p) return null;
  if (p.startsWith(`${env.UPLOAD_DIR}/`)) {
    return p.replace(env.UPLOAD_DIR, "/uploads");
  }
  return p;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!checkAuth(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { stationId } = await params;

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, timezone: true },
  });
  if (!station) {
    return new NextResponse("", { status: 404 });
  }

  const now = new Date();
  const tz = station.timezone || "UTC";
  const localTime = getLocalTime(now, tz);

  // Fetch all active schedule blocks and find the best match for now
  const blocks = await fetchScheduleBlocks(stationId);
  const activeBlock = getActiveBlock(blocks, localTime, stationId);

  let trackPath: string | null = null;
  let source = "autodj";

  if (activeBlock && activeBlock.sourceType !== "RANDOM_ALL" && activeBlock.sourceType !== "LIVE_SLOT") {
    const isSingle = isSingleSourceType(activeBlock.sourceType);

    if (isSingle) {
      // ── Single-source schedule block ──────────────────────────────────
      // Play exactly ONCE per window activation, then hand off to AutoDJ.
      // This prevents a short documentary/jingle from looping endlessly
      // throughout a long schedule window (e.g. 08:00–18:00).
      //
      // Window start is approximated as "now minus minutes-since-window-opened".
      const minutesIntoWindow = Math.max(
        0,
        localTime.nowMin - (activeBlock.startHour * 60 + activeBlock.startMin),
      );
      const windowStartMs = Date.now() - minutesIntoWindow * 60 * 1000;

      if (isAlreadyServedInWindow(stationId, activeBlock, windowStartMs)) {
        // Already played in this window activation → use AutoDJ for the rest
        trackPath = await getAutoDJTrack(stationId);
        source = "autodj-after-sched";
      } else {
        // First request in this window → serve the scheduled content
        trackPath = await getSingleSourcePath(activeBlock);
        if (trackPath) {
          markServedInWindow(stationId, activeBlock);
          source = `sched:${activeBlock.sourceType}:${activeBlock.name}`;
        } else {
          // Source file not found → fall back to AutoDJ
          trackPath = await getAutoDJTrack(stationId);
          source = "autodj-sched-missing";
        }
      }
    } else if (activeBlock.sourceType === "PLAYLIST") {
      // ── Playlist schedule block ───────────────────────────────────────
      // Cycle randomly through the playlist.  Playlists are expected to
      // have multiple tracks, so we do NOT apply the once-per-window limit.
      trackPath = getRandomTrackFromPlaylist(activeBlock.playlist);
      if (trackPath) {
        source = `sched:PLAYLIST:${activeBlock.name}`;
      } else {
        trackPath = await getAutoDJTrack(stationId);
        source = "autodj-playlist-empty";
      }
    }
  }

  // Default: AutoDJ
  if (!trackPath) {
    trackPath = await getAutoDJTrack(stationId);
    source = "autodj";
  }

  const liqPath = toLiqPath(trackPath);

  console.log(`[next-track] station=${stationId} source=${source} path=${liqPath ?? "(none)"}`);

  if (!liqPath) {
    // Empty response — Liquidsoap retries after its configured timeout
    return new NextResponse("", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse(liqPath + "\n", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
