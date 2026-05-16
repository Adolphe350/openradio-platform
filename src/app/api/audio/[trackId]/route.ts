import { createReadStream } from "fs";
import { stat } from "fs/promises";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseRange(rangeHeader: string | null, size: number) {
  if (!rangeHeader) return null;
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;

  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
    return null;
  }

  return { start, end: Math.min(end, size - 1) };
}

/**
 * Proxies audio track playback, solving CORS and content-type issues
 * for both local uploads and external storage (like transfer.iraady.com).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const { trackId } = await params;

  const track = await db.track.findUnique({
    where: { id: trackId },
    select: { fileUrl: true, filePath: true, title: true, artist: true, mimeType: true },
  });

  if (!track) {
    return NextResponse.json({ error: "Track not found" }, { status: 404 });
  }

  const rangeHeader = req.headers.get("range");
  const mimeType = track.mimeType || "audio/mpeg";

  if (track.filePath) {
    try {
      const fileStat = await stat(track.filePath);
      const range = parseRange(rangeHeader, fileStat.size);
      const headers = new Headers({
        "Content-Type": mimeType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      });

      if (range) {
        headers.set("Content-Length", String(range.end - range.start + 1));
        headers.set("Content-Range", `bytes ${range.start}-${range.end}/${fileStat.size}`);
        return new Response(createReadStream(track.filePath, range) as unknown as BodyInit, {
          status: 206,
          headers,
        });
      }

      headers.set("Content-Length", String(fileStat.size));
      return new Response(createReadStream(track.filePath) as unknown as BodyInit, {
        status: 200,
        headers,
      });
    } catch {
      // If the local file disappeared but an external URL exists, fall through to remote fetch.
      if (!track.fileUrl || track.fileUrl.startsWith("/")) {
        return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
      }
    }
  }

  const url = track.fileUrl;
  if (!url || url.startsWith("/")) {
    return NextResponse.json({ error: "No audio URL available" }, { status: 404 });
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent": "OpenRadio-AudioProxy/1.0",
    };
    if (rangeHeader) headers["Range"] = rangeHeader;

    const upstream = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: "Audio unavailable" }, { status: 502 });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", mimeType);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch audio", detail: String(e) },
      { status: 502 }
    );
  }
}
