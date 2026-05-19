/**
 * GET /api/internal/schedule-status/[stationId]
 *
 * Debug/test endpoint that shows the current schedule state for a station.
 * Returns what's currently active, what would play next, etc.
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

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stationId } = await params;

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, name: true, timezone: true },
  });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const now = new Date();
  const tz = station.timezone || "UTC";

  // Get local time in station timezone
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

  // Get all active schedule blocks
  const blocks = await db.scheduleBlock.findMany({
    where: { stationId, isActive: true },
    include: { playlist: { select: { id: true, name: true, _count: { select: { tracks: true } } } } },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
  });

  const activeBlocks = blocks.filter((b) => {
    const matchesDay = b.dayOfWeek === -1 || b.dayOfWeek === dow;
    const startMin = b.startHour * 60 + b.startMin;
    const endMin = b.endHour * 60 + b.endMin;
    const inWindow = nowMin >= startMin && nowMin < endMin;
    return matchesDay && inWindow;
  });

  // Test the next-track endpoint
  const nextTrackUrl = `${env.APP_BASE_URL}/api/internal/next-track/${stationId}?secret=${env.METRICS_POLL_SECRET}`;
  let nextTrackResult: string | null = null;
  try {
    const resp = await fetch(nextTrackUrl);
    nextTrackResult = (await resp.text()).trim() || "(empty - no track available)";
  } catch (e) {
    nextTrackResult = `(error: ${e instanceof Error ? e.message : "unknown"})`;
  }

  return NextResponse.json({
    station: station.name,
    timezone: tz,
    currentTime: {
      utc: now.toISOString(),
      local: `${get("weekday")} ${hour}:${String(minute).padStart(2, "0")}`,
      dayOfWeek: dow,
      minuteOfDay: nowMin,
    },
    scheduleBlocks: {
      total: blocks.length,
      active: activeBlocks.map((b) => ({
        id: b.id,
        name: b.name,
        sourceType: b.sourceType,
        dayOfWeek: b.dayOfWeek,
        time: `${b.startHour}:${String(b.startMin).padStart(2, "0")} - ${b.endHour}:${String(b.endMin).padStart(2, "0")}`,
        playlist: b.playlist ? { name: b.playlist.name, trackCount: b.playlist._count.tracks } : null,
      })),
      all: blocks.map((b) => ({
        id: b.id,
        name: b.name,
        sourceType: b.sourceType,
        dayOfWeek: b.dayOfWeek,
        time: `${b.startHour}:${String(b.startMin).padStart(2, "0")} - ${b.endHour}:${String(b.endMin).padStart(2, "0")}`,
        playlist: b.playlist ? { name: b.playlist.name, trackCount: b.playlist._count.tracks } : null,
      })),
    },
    nextTrack: nextTrackResult,
    mode: activeBlocks.length > 0 && activeBlocks[0].sourceType !== "RANDOM_ALL"
      ? "SCHEDULED"
      : "AUTODJ",
  });
}
