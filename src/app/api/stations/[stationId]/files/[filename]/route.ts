import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stationId: string; filename: string }> }
) {
  const { stationId, filename } = await params;

  // Validate filename — no path traversal
  const safe = path.basename(filename);
  if (safe !== filename || safe.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const station = await db.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(env.UPLOAD_DIR, stationId, safe);
  try {
    const buf = await readFile(filePath);
    const ext = safe.split(".").pop()?.toLowerCase() ?? "mp3";
    const mime = ext === "mp3" ? "audio/mpeg" : ext === "flac" ? "audio/flac" : ext === "ogg" ? "audio/ogg" : ext === "wav" ? "audio/wav" : "audio/mpeg";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Content-Length": buf.byteLength.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
