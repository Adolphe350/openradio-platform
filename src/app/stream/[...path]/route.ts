import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Proxies audio stream requests to the internal Icecast server.
 * This allows the public player to work even when STREAM_PUBLIC_BASE_URL
 * is not properly configured (e.g. still set to localhost).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const mountPath = "/" + segments.join("/");

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

    // Stream the audio response
    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "no-cache, no-store");
    responseHeaders.set("Connection", "keep-alive");

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
