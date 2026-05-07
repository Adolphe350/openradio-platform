import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const ALLOWED_MIME = ["audio/mpeg", "audio/mp3", "audio/flac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ stationId: string }> }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;
  const station = await db.station.findFirst({ where: { id: stationId, ownerId: user.id } });
  if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
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

  const track = await db.track.create({
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

  return NextResponse.json({ ok: true, track });
}
