/**
 * POST /api/internal/play-log/[stationId]
 *
 * Internal endpoint called by Liquidsoap's on_track handler to record
 * what is currently playing. Accepts poll-secret auth (no user session needed).
 *
 * Body: { title: string, artist: string }
 * Tries to resolve the trackId by matching title+artist against station tracks
 * for richer analytics (optional — skipped if no match).
 *
 * Auth: x-poll-secret header.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ stationId: string }> };

function checkAuth(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-poll-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  return secret === env.METRICS_POLL_SECRET;
}

export async function POST(req: NextRequest, { params }: Ctx) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { stationId } = await params;

  const station = await db.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  let body: { title?: string; artist?: string; durationSec?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const artist = (body.artist ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // Try to resolve the trackId by matching title (case-insensitive) against station tracks
  const matchedTrack = await db.track.findFirst({
    where: {
      stationId,
      title: { equals: title, mode: "insensitive" },
    },
    select: { id: true },
  });

  const log = await db.playLog.create({
    data: {
      stationId,
      title,
      artist: artist || "Unknown",
      trackId: matchedTrack?.id ?? null,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : null,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
