/**
 * GET /api/internal/next-track/[stationId]
 *
 * Pure AutoDJ endpoint — returns a random track from the default playlist
 * or all station tracks.
 *
 * Schedule logic has been moved to the Liquidsoap hard-cut switch:
 *  switch(track_sensitive=false, [(time_cond, sched_src), ..., ({true}, autodj)])
 * Each scheduled block has its own request.dynamic.list source that calls
 * /api/internal/sched-track/[stationId]/[blockId] instead.
 *
 * This endpoint is still used as the AutoDJ source in the .liq script.
 * Auth: x-poll-secret header or ?secret= query param.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ stationId: string }> };

function checkAuth(req: NextRequest): boolean {
  const s =
    req.headers.get("x-poll-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  return s === env.METRICS_POLL_SECRET;
}

function toLiqPath(p: string | null | undefined): string | null {
  if (!p) return null;
  if (p.startsWith(`${env.UPLOAD_DIR}/`)) return p.replace(env.UPLOAD_DIR, "/uploads");
  return p;
}

async function getAutoDJTrack(stationId: string): Promise<string | null> {
  // Try the default playlist first
  const defaultPlaylist = await db.playlist.findFirst({
    where: { stationId, isDefault: true },
    include: { tracks: { include: { track: true }, orderBy: { position: "asc" } } },
  });
  if (defaultPlaylist && defaultPlaylist.tracks.length > 0) {
    const valid = defaultPlaylist.tracks.filter((pt) => pt.track.filePath || pt.track.fileUrl);
    if (valid.length > 0) {
      const pt = valid[Math.floor(Math.random() * valid.length)];
      return pt.track.filePath || pt.track.fileUrl || null;
    }
  }
  // Fallback: random track from all station tracks
  const count = await db.track.count({ where: { stationId } });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  const tracks = await db.track.findMany({
    where: { stationId },
    select: { filePath: true, fileUrl: true },
    skip,
    take: 1,
  });
  const t = tracks[0];
  return t?.filePath || t?.fileUrl || null;
}

export async function GET(req: NextRequest, { params }: Ctx) {
  if (!checkAuth(req)) return new NextResponse("Unauthorized", { status: 401 });

  const { stationId } = await params;

  const station = await db.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) return new NextResponse("", { status: 404 });

  const trackPath = await getAutoDJTrack(stationId);
  const liqPath = toLiqPath(trackPath);

  console.log(`[next-track/autodj] station=${stationId} path=${liqPath ?? "(none)"}`);

  if (!liqPath) {
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new NextResponse(liqPath + "\n", { status: 200, headers: { "Content-Type": "text/plain" } });
}
