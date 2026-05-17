import { db } from "@/lib/db";
import { fetchIcecastStatus, findIcecastSource, getIcecastSourceMounts, normalizeIcecastSources } from "@/lib/icecast";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await fetchIcecastStatus(4000);
  const sources = normalizeIcecastSources(status?.icestats?.source);

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, mountPath: true },
  });

  const results: Record<string, { listeners: number; peak: number }> = {};

  for (const station of stations) {
    const match = findIcecastSource(sources, station.mountPath);
    results[station.id] = {
      listeners: match?.listeners ?? 0,
      peak: match?.listener_peak ?? match?.listeners ?? 0,
    };
  }

  if (sources.length > 0) {
    await db.$transaction(
      stations.map((station) => {
        const data = results[station.id] ?? { listeners: 0, peak: 0 };
        return db.listenerMetric.create({
          data: {
            stationId: station.id,
            currentListeners: data.listeners,
            peakListeners: data.peak,
            totalListeningHours: 0,
            uptimePercent: findIcecastSource(sources, station.mountPath) ? 99.9 : 0,
            storageUsedMb: 0,
          },
        });
      }),
    );
  }

  return NextResponse.json({
    sources: sources.map((source) => ({
      mount: getIcecastSourceMounts(source)[0] ?? null,
      listeners: source.listeners ?? 0,
      peak: source.listener_peak ?? source.listeners ?? 0,
    })),
    stations: results,
  });
}
