import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ stationId: string }> };

function parseBasicAuth(req: NextRequest): { username: string; password: string } | null {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("basic ")) return null;
  try {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    const colon = decoded.indexOf(":");
    if (colon === -1) return null;
    return { username: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
  } catch {
    return null;
  }
}

/**
 * Source proxy — allows encoders (BUTT, RadioBoss, Icecast-compatible) to connect
 * via the app's HTTPS port (443) instead of directly to Icecast port 8000.
 *
 * Encoder settings:
 *   Server:   <your-app-domain>
 *   Port:     443
 *   Mount:    /api/source/<stationId>
 *   Username: source
 *   Password: <station sourcePassword>
 *   Protocol: Icecast/HTTP (PUT mode)
 */
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { stationId } = await params;

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, mountPath: true, sourceUsername: true, sourcePassword: true },
  });

  if (!station) {
    return new NextResponse("Station not found", { status: 404 });
  }

  const creds = parseBasicAuth(req);
  if (!creds || creds.username !== station.sourceUsername || creds.password !== station.sourcePassword) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="OpenRadio Source"' },
    });
  }

  // Build Icecast upstream URL (internal)
  const mountPath = station.mountPath.startsWith("/") ? station.mountPath : `/${station.mountPath}`;
  const icecastUrl = `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}${mountPath}`;

  // Forward relevant headers to Icecast
  const fwdHeaders: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${station.sourceUsername}:${station.sourcePassword}`).toString("base64")}`,
    "Content-Type": req.headers.get("content-type") || "audio/mpeg",
    "User-Agent": req.headers.get("user-agent") || "OpenRadio-SourceProxy/1.0",
  };

  const iceMetaHeaders = ["ice-name", "ice-genre", "ice-bitrate", "ice-description", "ice-url", "ice-public", "icy-name", "icy-genre", "icy-br"];
  for (const h of iceMetaHeaders) {
    const v = req.headers.get(h);
    if (v) fwdHeaders[h] = v;
  }

  try {
    const upstream = await fetch(icecastUrl, {
      method: "PUT",
      headers: fwdHeaders,
      body: req.body,
      // @ts-expect-error duplex is not in standard fetch types
      duplex: "half",
      cache: "no-store",
    });

    const respHeaders = new Headers();
    respHeaders.set("Access-Control-Allow-Origin", "*");
    if (upstream.headers.get("content-type")) {
      respHeaders.set("Content-Type", upstream.headers.get("content-type")!);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: respHeaders,
    });
  } catch (err) {
    return new NextResponse(
      JSON.stringify({ error: "Failed to connect to Icecast", detail: err instanceof Error ? err.message : "Unknown" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

// Also handle SOURCE method by routing through PUT logic (some encoders use SOURCE)
export async function POST(req: NextRequest, ctx: Ctx) {
  // BUTT/Darkice may POST instead of PUT in some modes
  return PUT(req, ctx);
}

// Return encoder info for GET requests
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { stationId } = await params;
  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, name: true, mountPath: true, sourceUsername: true },
  });
  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    station: station.name,
    mount: station.mountPath,
    protocol: "Icecast/HTTP PUT",
    note: "Connect your encoder via HTTPS on port 443 using this proxy endpoint.",
  });
}
