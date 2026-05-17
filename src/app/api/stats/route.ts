import { db } from "@/lib/db";
import { fetchIcecastStatus, findIcecastSource, getIcecastCanonicalMount, normalizeIcecastSources } from "@/lib/icecast";
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

  // This public read endpoint must stay side-effect free. Persisted metric samples
  // are written by the protected cron/internal poll endpoints; writing them here
  // made a public stats request fail whenever the metrics index needed repair.


  return NextResponse.json({
    sources: sources.map((source) => ({
      mount: getIcecastCanonicalMount(source),
      listeners: source.listeners ?? 0,
      peak: source.listener_peak ?? source.listeners ?? 0,
    })),
    stations: results,
  });
}
