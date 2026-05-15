import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateStationConfig } from "@/lib/generate-station-config";

// Increase body size limit for file uploads (default is 1MB in Next.js)
export const dynamic = "force-dynamic";

const ALLOWED_MIME = ["audio/mpeg", "audio/mp3", "audio/flac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ stationId: string }> }) {
  try {
    const user = await getApiUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { stationId } = await params;
    const station = await db.station.findFirst({ where: { id: stationId, ownerId: user.id } });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      return NextResponse.json({ error: "Invalid form data", detail: String(e) }, { status: 400 });
    }

    const file = formData.get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > env.MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `File too large (max ${env.MAX_UPLOAD_BYTES / 1024 / 1024} MB)` }, { status: 413 });
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed. Use MP3, FLAC, OGG, WAV, or AAC." }, { status: 415 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const dir = path.join(env.UPLOAD_DIR, stationId);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, safeName);
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    const rawTitle = (formData.get("title") as string | null)?.trim() || file.name.replace(/\.[^.]+$/, "");
    const rawArtist = (formData.get("artist") as string | null)?.trim() || "Unknown Artist";
    const rawAlbum = (formData.get("album") as string | null)?.trim() || null;

    const result = await db.$transaction(async (tx) => {
      const track = await tx.track.create({
        data: {
          stationId,
          createdByUserId: user.id,
          title: rawTitle,
          artist: rawArtist,
          album: rawAlbum,
          filePath,
          fileSizeBytes: file.size,
          mimeType: file.type,
          fileUrl: `/api/stations/${stationId}/files/${safeName}`,
        },
      });

      const playlist = await tx.playlist.upsert({
        where: { stationId_name: { stationId, name: "Main Rotation" } },
        update: {},
        create: { stationId, createdById: user.id, name: "Main Rotation", isDefault: true },
      });

      const highestPosition = await tx.playlistTrack.aggregate({
        where: { playlistId: playlist.id },
        _max: { position: true },
      });

      await tx.playlistTrack.create({
        data: {
          playlistId: playlist.id,
          trackId: track.id,
          position: (highestPosition._max.position ?? 0) + 1,
        },
      });

      return { track, playlistId: playlist.id };
    });

    await generateStationConfig(stationId);

    return NextResponse.json({ ok: true, track: result.track, playlistId: result.playlistId });
  } catch (e) {
    console.error("[upload] Error:", e);
    return NextResponse.json({ error: "Internal server error", detail: String(e) }, { status: 500 });
  }
}
