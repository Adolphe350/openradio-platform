import { NextRequest, NextResponse } from "next/server";
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

  const status = await fetchCachedIcecastStatus();
  const sources = normalizeIcecastSources(status?.icestats?.source);
  const src = findIcecastSource(sources, mount);

  return NextResponse.json({
    title: src?.title ?? src?.song ?? null,
    listeners: src?.listeners ?? 0,
    live: !!src,
  });
}
