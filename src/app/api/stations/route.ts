import crypto from "crypto";

import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeMountPath } from "@/lib/stream";
import { slugify } from "@/lib/slug";

async function resolveUniqueSlug(name: string) {
  const base = slugify(name) || "station";
  let slug = base;
  let suffix = 1;

  while (true) {
    const existing = await db.station.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }

    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function GET() {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  const stations = await db.station.findMany({
    where: { ownerId: auth.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          tracks: true,
          playlists: true
        }
      }
    }
  });

  return NextResponse.json({ stations });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth.error) {
    return auth.error;
  }

  // Enforce station limit based on plan
  const subscription = await db.userSubscription.findFirst({
    where: { userId: auth.user.id, status: "active" },
    include: { plan: true },
    orderBy: { startedAt: "desc" },
  });
  const maxStations: number | null = subscription?.plan.maxStations ?? 2;
  if (maxStations !== null) {
    const currentCount = await db.station.count({ where: { ownerId: auth.user.id } });
    if (currentCount >= maxStations) {
      return NextResponse.json(
        { error: `Your plan allows a maximum of ${maxStations} station${maxStations !== 1 ? "s" : ""}. Upgrade to add more.` },
        { status: 403 }
      );
    }
  }

  const body = await request.json();

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 3) {
    return NextResponse.json({ error: "Name must be at least 3 characters" }, { status: 400 });
  }

  const slug = await resolveUniqueSlug(name);

  const station = await db.station.create({
    data: {
      ownerId: auth.user.id,
      name,
      slug,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      genre: typeof body.genre === "string" ? body.genre.trim() || null : null,
      language: typeof body.language === "string" ? body.language.trim() || "English" : "English",
      timezone: typeof body.timezone === "string" ? body.timezone.trim() || "UTC" : "UTC",
      country: typeof body.country === "string" ? body.country.trim() || null : null,
      mountPath:
        typeof body.mountPath === "string" && body.mountPath.trim().length > 0
          ? normalizeMountPath(body.mountPath.trim())
          : normalizeMountPath(`/${slug}.mp3`),
      sourceUsername: "source",
      sourcePassword: crypto.randomBytes(12).toString("hex")
    }
  });

  await db.playlist.create({
    data: {
      stationId: station.id,
      createdById: auth.user.id,
      name: "Main Rotation",
      description: "Default AutoDJ rotation",
      isDefault: true
    }
  });

  return NextResponse.json({ station }, { status: 201 });
}
