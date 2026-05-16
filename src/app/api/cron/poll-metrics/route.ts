import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { fetchIcecastStatus, findIcecastSource, normalizeIcecastSources } from "@/lib/icecast";

// This route is designed to be called by an external cron (docker-compose curl cron
// or Vercel cron). Protected by METRICS_POLL_SECRET header or query param.

export async function GET(req: NextRequest) {
  // Accept secret via header OR query param (for simple curl cron usage)
  const secret =
    req.headers.get("x-poll-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  if (secret !== env.METRICS_POLL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await fetchIcecastStatus();
  if (!status) {
    return NextResponse.json({ ok: false, reason: "Icecast unreachable" });
  }

  const sources = normalizeIcecastSources(status?.icestats?.source);

  const stations = await db.station.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    select: {
      id: true,
      mountPath: true,
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
    },
  });

  let updated = 0;

  for (const station of stations) {
    const src = findIcecastSource(sources, station.mountPath);

    const currentListeners = src?.listeners ?? 0;
    const prevPeak = station.metrics[0]?.peakListeners ?? 0;
    const peakListeners = Math.max(prevPeak, currentListeners);
    const prevHours = station.metrics[0]?.totalListeningHours ?? 0;
    const totalListeningHours = +(prevHours + (currentListeners * 5) / 60).toFixed(2);
    const previousUptime = station.metrics[0]?.uptimePercent ?? 99;
    const uptimePercent = src ? 100 : previousUptime;

    await db.listenerMetric.create({
      data: {
        stationId: station.id,
        currentListeners,
        peakListeners,
        totalListeningHours,
        uptimePercent,
        storageUsedMb: station.metrics[0]?.storageUsedMb ?? 0,
      },
    });

    // Prune old samples — keep last 288 (24 h at 5-min intervals)
    const old = await db.listenerMetric.findMany({
      where: { stationId: station.id },
      orderBy: { sampledAt: "desc" },
      skip: 288,
      select: { id: true },
    });
    if (old.length > 0) {
      await db.listenerMetric.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
    }

    updated++;
  }

  return NextResponse.json({ ok: true, updated, mountsLive: sources.map((s) => s.mount) });
}
