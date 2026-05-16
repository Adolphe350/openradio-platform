import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { fetchIcecastStatus, findIcecastSource, normalizeIcecastSources } from "@/lib/icecast";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics
 * Query params:
 *   from        ISO date string  (default: 7 days ago)
 *   to          ISO date string  (default: now)
 *   stationId   string           (optional — all stations if omitted)
 *   groupBy     "station"|"day"  (default: "day")
 */
export async function GET(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const stationId = url.searchParams.get("stationId") ?? undefined;
  const groupBy = url.searchParams.get("groupBy") ?? "day";

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const from = fromParam ? new Date(fromParam) : sevenDaysAgo;
  const to = toParam ? new Date(toParam) : now;

  // Validate stationId ownership if provided
  if (stationId) {
    const station = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  // Get all user stations (for ownership filter)
  const userStations = await db.station.findMany({
    where: { ownerId: auth.user.id, ...(stationId ? { id: stationId } : {}) },
    select: { id: true, name: true },
  });
  const stationIds = userStations.map((s) => s.id);

  // Fetch metrics in range
  const metrics = await db.listenerMetric.findMany({
    where: {
      stationId: { in: stationIds },
      sampledAt: { gte: from, lte: to },
    },
    orderBy: { sampledAt: "asc" },
    select: { stationId: true, sampledAt: true, currentListeners: true, peakListeners: true },
  });

  // Previous period (for comparison: same duration, one period earlier)
  const duration = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - duration);
  const prevTo = new Date(from.getTime());
  const prevMetrics = await db.listenerMetric.findMany({
    where: {
      stationId: { in: stationIds },
      sampledAt: { gte: prevFrom, lte: prevTo },
    },
    orderBy: { sampledAt: "asc" },
    select: { stationId: true, sampledAt: true, currentListeners: true },
  });

  if (groupBy === "station") {
    // Group by station — return per-station totals
    const stationMap = new Map(userStations.map((s) => [s.id, s.name]));
    const byStation: Record<string, { name: string; listeners: number; peak: number; dataPoints: { date: string; value: number }[] }> = {};

    for (const m of metrics) {
      if (!byStation[m.stationId]) {
        byStation[m.stationId] = { name: stationMap.get(m.stationId) ?? m.stationId, listeners: 0, peak: 0, dataPoints: [] };
      }
      byStation[m.stationId].listeners += m.currentListeners;
      byStation[m.stationId].peak = Math.max(byStation[m.stationId].peak, m.peakListeners);
      byStation[m.stationId].dataPoints.push({
        date: m.sampledAt.toISOString().slice(0, 10),
        value: m.currentListeners,
      });
    }
    return NextResponse.json({ groupBy: "station", stations: Object.values(byStation) });
  }

  // Group by day
  const dayMap = new Map<string, number>();
  for (const m of metrics) {
    const day = m.sampledAt.toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + m.currentListeners);
  }

  const prevDayMap = new Map<string, number>();
  for (const m of prevMetrics) {
    // Shift previous period dates forward by duration to align day-of-week
    const shifted = new Date(m.sampledAt.getTime() + duration);
    const day = shifted.toISOString().slice(0, 10);
    prevDayMap.set(day, (prevDayMap.get(day) ?? 0) + m.currentListeners);
  }

  // Build array covering every day in [from, to]
  const current: { date: string; value: number }[] = [];
  const previous: { date: string; value: number }[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const day = cursor.toISOString().slice(0, 10);
    current.push({ date: day, value: dayMap.get(day) ?? 0 });
    previous.push({ date: day, value: prevDayMap.get(day) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  let thisTotal = current.reduce((s, d) => s + d.value, 0);
  const prevTotal = previous.reduce((s, d) => s + d.value, 0);

  if (thisTotal === 0 && stationIds.length > 0) {
    const status = await fetchIcecastStatus();
    const sources = normalizeIcecastSources(status?.icestats?.source);
    const stationsWithMounts = await db.station.findMany({
      where: { id: { in: stationIds } },
      select: { id: true, mountPath: true, name: true },
    });

    const liveCounts = stationsWithMounts.map((station) => {
      const source = findIcecastSource(sources, station.mountPath);
      return {
        stationId: station.id,
        name: station.name,
        count: source?.listeners ?? 0,
      };
    });

    const liveTotal = liveCounts.reduce((sum, item) => sum + item.count, 0);
    if (liveTotal > 0) {
      const today = now.toISOString().slice(0, 10);
      const bucket = current.find((item) => item.date === today);
      if (bucket) {
        bucket.value = liveTotal;
      } else {
        current.push({ date: today, value: liveTotal });
      }
      thisTotal = current.reduce((s, d) => s + d.value, 0);
    }
  }

  const pctChange = prevTotal > 0 ? ((thisTotal - prevTotal) / prevTotal) * 100 : 0;

  return NextResponse.json({
    groupBy: "day",
    from: from.toISOString(),
    to: to.toISOString(),
    current,
    previous,
    summary: {
      thisTotal,
      prevTotal,
      pctChange: Math.round(pctChange * 10) / 10,
    },
  });
}
