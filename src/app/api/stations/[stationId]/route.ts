import { NextResponse } from "next/server";
import { StationStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeMountPath } from "@/lib/stream";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId } = await params;

  const station = await db.station.findFirst({
    where: { id: stationId, ownerId: auth.user.id },
    include: {
      _count: {
        select: {
          tracks: true,
          playlists: true
        }
      },
      metrics: {
        orderBy: { sampledAt: "desc" },
        take: 10
      }
    }
  });

  if (!station) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  return NextResponse.json({ station });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId } = await params;
  const body = await request.json();
  const statusInput = typeof body.status === "string" ? body.status.toUpperCase() : undefined;
  const status = statusInput && Object.values(StationStatus).includes(statusInput as StationStatus)
    ? (statusInput as StationStatus)
    : undefined;

  const existing = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  const station = await db.station.update({
    where: { id: stationId },
    data: {
      name: typeof body.name === "string" ? body.name.trim() || undefined : undefined,
      description: typeof body.description === "string" ? body.description.trim() || null : undefined,
      genre: typeof body.genre === "string" ? body.genre.trim() || null : undefined,
      language: typeof body.language === "string" ? body.language.trim() || undefined : undefined,
      timezone: typeof body.timezone === "string" ? body.timezone.trim() || undefined : undefined,
      country: typeof body.country === "string" ? body.country.trim() || null : undefined,
      streamDescription:
        typeof body.streamDescription === "string" ? body.streamDescription.trim() || null : undefined,
      mountPath:
        typeof body.mountPath === "string" && body.mountPath.trim().length > 0
          ? normalizeMountPath(body.mountPath.trim())
          : undefined,
      status
    }
  });

  return NextResponse.json({ station });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const { stationId } = await params;

  const existing = await db.station.findFirst({ where: { id: stationId, ownerId: auth.user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Station not found" }, { status: 404 });
  }

  await db.station.delete({ where: { id: stationId } });
  return NextResponse.json({ success: true });
}
