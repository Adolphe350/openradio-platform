import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Proxies audio track playback, solving CORS and content-type issues
 * when tracks are stored on external services (like transfer.iraady.com).
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

  const url = track.fileUrl;
  if (!url) {
    return NextResponse.json({ error: "No audio URL available" }, { status: 404 });
  }

  try {
    // Fetch from external source
    const rangeHeader = req.headers.get("range");
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
    responseHeaders.set("Content-Type", track.mimeType || "audio/mpeg");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    // Forward content-length and content-range for range requests
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
