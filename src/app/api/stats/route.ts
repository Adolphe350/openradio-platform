import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type IcecastSource = {
  mount: string;
  listeners: number;
  peak_listeners?: number;
};

async function fetchIcecastStats(): Promise<IcecastSource[]> {
  const adminUrl = `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}/status-json.xsl`;

  try {
    const res = await fetch(adminUrl, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const icestats = data?.icestats;
    if (!icestats) return [];

    const source = icestats.source;
    if (!source) return [];

    const sources: IcecastSource[] = Array.isArray(source) ? source : [source];

    return sources.map((s: Record<string, unknown>) => ({
      mount: String(s.listenurl ?? "").split("/").pop() ? `/${String(s.listenurl ?? "").split("/").pop()}` : "/unknown",
      listeners: Number(s.listeners ?? 0),
      peak_listeners: Number(s.listener_peak ?? s.listeners ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  const sources = await fetchIcecastStats();

  const stations = await db.station.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, mountPath: true },
  });

  const results: Record<string, { listeners: number; peak: number }> = {};

  for (const station of stations) {
    const match = sources.find(
      (s) => s.mount === station.mountPath || s.mount === station.mountPath.replace(/^\//, "")
    );
    results[station.id] = {
      listeners: match?.listeners ?? 0,
      peak: match?.peak_listeners ?? 0,
    };
  }

  if (sources.length > 0) {
    for (const station of stations) {
      const data = results[station.id];
      if (data) {
        await db.listenerMetric.create({
          data: {
            stationId: station.id,
            currentListeners: data.listeners,
            peakListeners: data.peak,
            totalListeningHours: 0,
            uptimePercent: 99.9,
            storageUsedMb: 0,
          },
        });
      }
    }
  }

  return NextResponse.json({ sources, stations: results });
}
