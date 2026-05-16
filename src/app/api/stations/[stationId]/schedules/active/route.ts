/**
 * GET /api/stations/[stationId]/schedules/active
 *
 * Returns the currently-active schedule block(s) for the station based on
 * the current server time. Supports an optional `?at=<ISO8601>` query param
 * to resolve for a specific point in time (useful for testing/debugging).
 *
 * This endpoint is used by the AutoDJ resolver and can be polled by the
 * Liquidsoap script or any monitoring tooling.
 */
import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ stationId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;
  const station = await db.station.findFirst({ where: { id: stationId, ownerId: user.id } });
  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const atParam = req.nextUrl.searchParams.get("at");
  const now = atParam ? new Date(atParam) : new Date();

  const active = resolveActiveBlocks(
    await db.scheduleBlock.findMany({
      where: { stationId, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
      include: { playlist: { select: { id: true, name: true } } },
    }),
    now,
  );

  return NextResponse.json({
    resolvedAt: now.toISOString(),
    active,
    fallback: active.length === 0,
  });
}

/**
 * Resolve which schedule blocks are active at the given time.
 * JS Date.getDay(): 0=Sun, 1=Mon ... 6=Sat — matches our dayOfWeek convention.
 */
function resolveActiveBlocks(
  blocks: Array<{
    id: string;
    name: string;
    dayOfWeek: number;
    startHour: number;
    startMin: number;
    endHour: number;
    endMin: number;
    sourceType: string;
    sourceId: string | null;
    playlistId: string | null;
    color: string | null;
    notes: string | null;
    playlist: { id: string; name: string } | null;
  }>,
  now: Date,
) {
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  const nowMin = now.getHours() * 60 + now.getMinutes();

  return blocks.filter((b) => {
    const matchesDay = b.dayOfWeek === -1 || b.dayOfWeek === dow;
    const startMin = b.startHour * 60 + b.startMin;
    const endMin = b.endHour * 60 + b.endMin;
    const inWindow = nowMin >= startMin && nowMin < endMin;
    return matchesDay && inWindow;
  });
}
