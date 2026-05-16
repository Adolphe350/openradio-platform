import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateStationConfig } from "@/lib/generate-station-config";

export async function POST(req: NextRequest, { params }: { params: Promise<{ stationId: string }> }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;
  const station = await db.station.findFirst({
    where: { id: stationId, ownerId: user.id },
  });

  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await generateStationConfig(stationId);

  return NextResponse.json({ ok: true, stationId });
}
