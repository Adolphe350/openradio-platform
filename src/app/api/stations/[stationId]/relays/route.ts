import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ stationId: string }> };

async function owned(stationId: string, userId: string) {
  return db.station.findFirst({ where: { id: stationId, ownerId: userId } });
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const relays = await db.relayStream.findMany({ where: { stationId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(relays);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { name, url } = await req.json() as { name: string; url: string };
  if (!name || !url) return NextResponse.json({ error: "name and url required" }, { status: 400 });
  const relay = await db.relayStream.create({ data: { stationId, name, url } });
  return NextResponse.json(relay, { status: 201 });
}
