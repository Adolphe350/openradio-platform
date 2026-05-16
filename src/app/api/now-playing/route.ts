import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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

  const liveListeners = src?.listeners ?? 0;

  return NextResponse.json({
    title: src?.title ?? src?.song ?? null,
    listeners: liveListeners,
    live: !!src,
  });
}
