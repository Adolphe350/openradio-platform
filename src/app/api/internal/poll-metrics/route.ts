"use server";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchIcecastStatus, findIcecastSource, normalizeIcecastSources } from "@/lib/icecast";

// Internal endpoint — called by a cron / external scheduler.
// Protected by a shared secret in the Authorization header.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-poll-secret");
  const expected = process.env.METRICS_POLL_SECRET ?? "openradio-internal";
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await fetchIcecastStatus();
  if (!status) {
    return NextResponse.json({ ok: false, reason: "Icecast unreachable" });
  }

  const sources = normalizeIcecastSources(status?.icestats?.source);

  // Load all active stations
  const stations = await db.station.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true, mountPath: true, metrics: { orderBy: { sampledAt: "desc" }, take: 1 } },
  });

  let updated = 0;

  for (const station of stations) {
    const src = findIcecastSource(sources, station.mountPath);

    const currentListeners = src?.listeners ?? 0;
    const prevPeak = station.metrics[0]?.peakListeners ?? 0;
    const peakListeners = Math.max(prevPeak, currentListeners);
    const prevHours = station.metrics[0]?.totalListeningHours ?? 0;
    // Add ~5 min worth of listener-hours since last sample
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

    // Keep only last 288 samples (~24h at 5-min intervals)
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

  return NextResponse.json({ ok: true, updated, sources: sources.length });
}

// GET — public status check (no secret needed)
export async function GET() {
  const status = await fetchIcecastStatus();
  const sources = normalizeIcecastSources(status?.icestats?.source);
  return NextResponse.json({ reachable: !!status, mountsLive: sources.map((s) => s.mount) });
}
