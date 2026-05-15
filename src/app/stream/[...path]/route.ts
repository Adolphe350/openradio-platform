import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getPublicStreamUrl } from "@/lib/stream";
import { getRequestOrigin } from "@/lib/public-url";

export const dynamic = "force-dynamic";

/**
 * Proxies audio stream requests to the internal Icecast server.
 * Also serves M3U and PLS playlist files for stations by slug.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const mountPath = "/" + segments.join("/");

  // Handle M3U playlist requests: /stream/[stationSlug].m3u
  if (mountPath.endsWith(".m3u") && segments.length === 1) {
    const slug = segments[0].replace(/\.m3u$/, "");
    const station = await db.station.findFirst({
      where: {
        OR: [
          { slug },
          { mountPath: `/${slug}.mp3` },
        ],
      },
      select: { id: true, name: true, slug: true, mountPath: true, description: true, genre: true },
    });
    if (!station) {
      return new Response("Station not found", { status: 404, headers: { "Content-Type": "text/plain" } });
    }
    const streamUrl = getPublicStreamUrl(station.mountPath);
    const origin = getRequestOrigin(req);
    const absoluteUrl = streamUrl.startsWith("/")
      ? `${origin}${streamUrl}`
      : streamUrl;
    const m3u = `#EXTM3U\n#EXTINF:-1 tvg-name="${station.name}",${station.name}\n${absoluteUrl}\n`;
    return new Response(m3u, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpegurl",
        "Content-Disposition": `attachment; filename="${slug}.m3u"`,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Handle PLS playlist requests: /stream/[stationSlug].pls
  if (mountPath.endsWith(".pls") && segments.length === 1) {
    const slug = segments[0].replace(/\.pls$/, "");
    const station = await db.station.findFirst({
      where: {
        OR: [
          { slug },
          { mountPath: `/${slug}.mp3` },
        ],
      },
      select: { id: true, name: true, slug: true, mountPath: true },
    });
    if (!station) {
      return new Response("Station not found", { status: 404, headers: { "Content-Type": "text/plain" } });
    }
    const streamUrl = getPublicStreamUrl(station.mountPath);
    const origin = getRequestOrigin(req);
    const absoluteUrl = streamUrl.startsWith("/")
      ? `${origin}${streamUrl}`
      : streamUrl;
    const pls = `[playlist]\nFile1=${absoluteUrl}\nTitle1=${station.name}\nLength1=-1\nNumberOfEntries=1\nVersion=2\n`;
    return new Response(pls, {
      status: 200,
      headers: {
        "Content-Type": "audio/x-scpls",
        "Content-Disposition": `attachment; filename="${slug}.pls"`,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const icecastUrl = `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}${mountPath}`;

  try {
    const upstream = await fetch(icecastUrl, {
      headers: {
        // Forward relevant headers
        "User-Agent": req.headers.get("user-agent") || "OpenRadio-Proxy/1.0",
        "Icy-MetaData": req.headers.get("icy-metadata") || "0",
      },
      // Don't buffer — stream it
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) {
      // Station not live — return a friendly JSON error
      return new Response(
        JSON.stringify({
          error: "Station is not currently live",
          status: "offline",
          mount: mountPath,
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Stream the audio response.
    // Do NOT forward hop-by-hop headers (Connection, Transfer-Encoding,
    // Keep-Alive) — they are invalid in HTTP/2 and cause broken chunked output
    // in production proxies.
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "no-cache, no-store");
    responseHeaders.set("X-Accel-Buffering", "no");

    // Forward Icecast metadata headers
    const iceHeaders = ["icy-name", "icy-description", "icy-genre", "icy-br", "icy-sr"];
    for (const h of iceHeaders) {
      const val = upstream.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    return new Response(upstream.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (e) {
    // Icecast unreachable or timeout
    return new Response(
      JSON.stringify({
        error: "Stream temporarily unavailable",
        status: "offline",
        detail: e instanceof Error ? e.message : "Connection failed",
      }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
