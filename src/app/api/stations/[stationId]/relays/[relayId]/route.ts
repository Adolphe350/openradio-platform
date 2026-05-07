import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ stationId: string; relayId: string }> };

async function owned(stationId: string, userId: string) {
  return db.station.findFirst({ where: { id: stationId, ownerId: userId } });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId, relayId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const result = await db.relayStream.updateMany({ where: { id: relayId, stationId }, data: body });
  return NextResponse.json({ ok: result.count > 0 });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId, relayId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.relayStream.deleteMany({ where: { id: relayId, stationId } });
  return NextResponse.json({ ok: true });
}
