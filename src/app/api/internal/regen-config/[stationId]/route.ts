/**
 * POST /api/internal/regen-config/[stationId]
 *
 * Regenerates the Liquidsoap config for a station. Used internally
 * after deployment to update the .liq script without requiring user auth.
 *
 * Auth: internal secret via x-poll-secret header or ?secret= query param.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateStationConfig } from "@/lib/generate-station-config";

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

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, name: true },
  });
  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  await generateStationConfig(stationId);

  return NextResponse.json({ ok: true, station: station.name, message: "Config regenerated" });
}
