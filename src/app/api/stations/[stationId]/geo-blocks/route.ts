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
  const blocks = await db.geoBlock.findMany({ where: { stationId }, orderBy: { countryName: "asc" } });
  return NextResponse.json(blocks);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { countryCode, countryName } = await req.json() as { countryCode: string; countryName: string };
  if (!countryCode || !countryName) return NextResponse.json({ error: "countryCode and countryName required" }, { status: 400 });
  try {
    const block = await db.geoBlock.create({ data: { stationId, countryCode: countryCode.toUpperCase(), countryName } });
    return NextResponse.json(block, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Already blocked" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { stationId } = await params;
  if (!await owned(stationId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { countryCode } = await req.json() as { countryCode: string };
  await db.geoBlock.deleteMany({ where: { stationId, countryCode: countryCode.toUpperCase() } });
  return NextResponse.json({ ok: true });
}
