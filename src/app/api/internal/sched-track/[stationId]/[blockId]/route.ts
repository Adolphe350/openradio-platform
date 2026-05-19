/**
 * GET /api/internal/sched-track/[stationId]/[blockId]
 *
 * Called by Liquidsoap's per-block request.dynamic.list source.
 * Returns the file path for the scheduled block if it should play,
 * or an empty 200 if the content is exhausted / window is over.
 *
 * An empty response makes request.dynamic.list unavailable, so
 * switch(track_sensitive=false) falls through to AutoDJ for the
 * rest of the window.
 *
 * Behaviour per source type:
 *  TRACK / PODCAST_EPISODE / RECORDING — play ONCE per window activation,
 *    then return empty so AutoDJ takes over.
 *  PLAYLIST — return a random track from the playlist on every call
 *    (playlists are meant to cycle; no per-window limit).
 *  RANDOM_ALL / LIVE_SLOT — always return empty (handled in the .liq switch
 *    directly; this endpoint should never be called for those types).
 *
 * Auth: x-poll-secret header or ?secret= query param.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import {
  isAlreadyServedInWindow,
  markServedInWindow,
} from "@/lib/schedule-dedup";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ stationId: string; blockId: string }> };

function checkAuth(req: NextRequest): boolean {
  const s =
    req.headers.get("x-poll-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  return s === env.METRICS_POLL_SECRET;
}

function empty(): NextResponse {
  return new NextResponse("", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

function track(path: string): NextResponse {
  return new NextResponse(path + "\n", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

function toLiqPath(p: string | null | undefined): string | null {
  if (!p) return null;
  if (p.startsWith(`${env.UPLOAD_DIR}/`)) return p.replace(env.UPLOAD_DIR, "/uploads");
  return p;
}

/** Parse local time in the station's timezone. */
function getLocalTime(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dow = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[get("weekday")] ?? 0;
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));
  return { dow, hour, minute, nowMin: hour * 60 + minute };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!checkAuth(req)) return new NextResponse("Unauthorized", { status: 401 });

  const { stationId, blockId } = await params;

  const block = await db.scheduleBlock.findFirst({
    where: { id: blockId, stationId },
    include: {
      playlist: {
        include: { tracks: { include: { track: true }, orderBy: { position: "asc" } } },
      },
    },
  });
  if (!block || !block.isActive) return empty();

  // RANDOM_ALL / LIVE_SLOT are handled directly in the .liq switch — not here
  if (block.sourceType === "RANDOM_ALL" || block.sourceType === "LIVE_SLOT") return empty();

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { timezone: true },
  });
  const tz = station?.timezone || "UTC";
  const now = new Date();
  const { dow, nowMin } = getLocalTime(now, tz);

  const startMin = block.startHour * 60 + block.startMin;
  const endMin = block.endHour * 60 + block.endMin;
  const matchesDay = block.dayOfWeek === -1 || block.dayOfWeek === dow;

  // Active window check: in window OR within 5-min catch-up (for hard-cut gaps)
  const CATCHUP = 5;
  const inWindow = matchesDay && nowMin >= startMin && nowMin < endMin;
  const inCatchup = matchesDay && nowMin >= endMin && nowMin < endMin + CATCHUP;

  if (!inWindow && !inCatchup) return empty();

  // Approximate UTC timestamp when the window opened
  const minutesIntoWindow = Math.max(0, nowMin - startMin);
  const windowStartMs = Date.now() - minutesIntoWindow * 60 * 1000;

  // ── PLAYLIST ──────────────────────────────────────────────────────────────
  if (block.sourceType === "PLAYLIST") {
    if (!block.playlist) return empty();
    const valid = block.playlist.tracks.filter((pt) => pt.track.filePath || pt.track.fileUrl);
    if (valid.length === 0) return empty();
    const pt = valid[Math.floor(Math.random() * valid.length)];
    const p = toLiqPath(pt.track.filePath || pt.track.fileUrl);
    if (!p) return empty();
    console.log(`[sched-track] station=${stationId} block=${block.name} PLAYLIST path=${p}`);
    return track(p);
  }

  // ── TRACK / PODCAST_EPISODE / RECORDING ───────────────────────────────────
  // Play exactly once per window activation, then return empty so AutoDJ takes over
  const blockRef = {
    id: block.id,
    dayOfWeek: block.dayOfWeek,
    startHour: block.startHour,
    startMin: block.startMin,
  };

  if (isAlreadyServedInWindow(stationId, blockRef, windowStartMs)) {
    console.log(`[sched-track] station=${stationId} block=${block.name} already served — yielding to AutoDJ`);
    return empty();
  }

  // Resolve the file path
  let filePath: string | null = null;
  if (block.sourceType === "TRACK" && block.sourceId) {
    const t = await db.track.findUnique({
      where: { id: block.sourceId },
      select: { filePath: true, fileUrl: true },
    });
    filePath = t?.filePath || t?.fileUrl || null;
  } else if (block.sourceType === "PODCAST_EPISODE" && block.sourceId) {
    const ep = await db.episode.findUnique({
      where: { id: block.sourceId },
      select: { filePath: true, fileUrl: true },
    });
    filePath = ep?.filePath || ep?.fileUrl || null;
  } else if (block.sourceType === "RECORDING" && block.sourceId) {
    const rec = await db.recording.findUnique({
      where: { id: block.sourceId },
      select: { filePath: true, fileUrl: true },
    });
    filePath = rec?.filePath || rec?.fileUrl || null;
  }

  const liqPath = toLiqPath(filePath);
  if (!liqPath) {
    console.log(`[sched-track] station=${stationId} block=${block.name} no file found — yielding to AutoDJ`);
    return empty();
  }

  markServedInWindow(stationId, blockRef);
  console.log(`[sched-track] station=${stationId} block=${block.name} [${block.sourceType}] path=${liqPath}`);
  return track(liqPath);
}
