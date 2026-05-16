import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildPublicPopularity, resolveStationMetric } from "@/lib/analytics";
import { fetchIcecastStatus as fetchIcecastStatusLive, findIcecastSource, normalizeIcecastSources, type IcecastStatus } from "@/lib/icecast";

// Cache Icecast responses for 10 s to avoid hammering it
const cache = new Map<string, { data: IcecastStatus; expiresAt: number }>();

async function fetchCachedIcecastStatus(): Promise<IcecastStatus | null> {
  const key = "icecast-status";
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const data = await fetchIcecastStatusLive(4000);
  if (!data) return null;

  cache.set(key, { data, expiresAt: Date.now() + 10_000 });
  return data;
}

export async function GET(req: NextRequest) {
  const mount = req.nextUrl.searchParams.get("mount");
  if (!mount) return NextResponse.json({ error: "mount required" }, { status: 400 });

  const normalizedMount = mount.startsWith("/") ? mount : `/${mount}`;

  const [status, station] = await Promise.all([
    fetchCachedIcecastStatus(),
    db.station.findFirst({
      where: { mountPath: normalizedMount },
      include: {
        _count: { select: { tracks: true, playlists: true } },
        metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
      },
    }),
  ]);

  const sources = normalizeIcecastSources(status?.icestats?.source);
  const src = findIcecastSource(sources, normalizedMount);

  let publicListeners = 0;
  if (station) {
    const metricResult = resolveStationMetric({
      stationId: station.id,
      trackCount: station._count.tracks,
      playlistCount: station._count.playlists,
      createdAt: station.createdAt,
      metric: station.metrics[0]
        ? {
            currentListeners: station.metrics[0].currentListeners,
            peakListeners: station.metrics[0].peakListeners,
            totalListeningHours: station.metrics[0].totalListeningHours,
            uptimePercent: station.metrics[0].uptimePercent,
            storageUsedMb: station.metrics[0].storageUsedMb,
            sampledAt: station.metrics[0].sampledAt,
          }
        : null,
    });

    publicListeners = buildPublicPopularity({
      stationId: station.id,
      trackCount: station._count.tracks,
      playlistCount: station._count.playlists,
      createdAt: station.createdAt,
      metric: metricResult.source === "live" ? metricResult.metric : null,
      status: station.status,
    }).listenersNow;
  }

  return NextResponse.json({
    title: src?.title ?? src?.song ?? null,
    listeners: publicListeners,
    live: !!src,
  });
}
