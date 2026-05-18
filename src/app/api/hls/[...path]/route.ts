import { NextRequest } from "next/server";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!env.STREAM_HLS_BASE_URL) {
    return new Response("HLS is not configured", { status: 503, headers: { "Content-Type": "text/plain" } });
  }

  const { path: segments } = await params;
  const target = `${trimTrailingSlash(env.STREAM_HLS_BASE_URL)}/${segments.map(encodeURIComponent).join("/")}`;

  try {
    const upstream = await fetch(target, {
      cache: "no-store",
      headers: {
        "User-Agent": req.headers.get("user-agent") || "OpenRadio-HLS-Proxy/1.0",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("HLS asset unavailable", {
        status: upstream.status || 502,
        headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
      });
    }

    const contentType = upstream.headers.get("content-type") ||
      (target.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "video/mp2t");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cache-Control", target.endsWith(".m3u8") ? "no-cache, no-store" : "public, max-age=10");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "HLS proxy failed", detail: error instanceof Error ? error.message : String(error) }),
      { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
}
