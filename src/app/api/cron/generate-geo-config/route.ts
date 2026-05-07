import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateNginxGeoSnippet, generateNginxIcecastProxy } from "@/lib/generate-nginx-geo";

const NGINX_GEO_DIR = env.NGINX_GEO_DIR;

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-poll-secret") ?? "";
  if (secret !== env.METRICS_POLL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stations = await db.station.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    select: {
      id: true,
      mountPath: true,
      geoBlocks: { select: { countryCode: true } },
    },
  });

  await mkdir(NGINX_GEO_DIR, { recursive: true });

  // Write per-station geo snippet files
  for (const station of stations) {
    const codes = station.geoBlocks.map((b) => b.countryCode);
    const snippet = generateNginxGeoSnippet(station.id, station.mountPath, codes);
    await writeFile(path.join(NGINX_GEO_DIR, `${station.id}.conf`), snippet, "utf8");
  }

  // Write consolidated nginx proxy config
  const proxyConfig = generateNginxIcecastProxy(
    env.STREAM_SOURCE_HOST,
    env.ICECAST_SOURCE_PORT,
    stations.map((s) => ({
      stationId: s.id,
      mountPath: s.mountPath,
      blockedCodes: s.geoBlocks.map((b) => b.countryCode),
    }))
  );
  await writeFile(path.join(NGINX_GEO_DIR, "icecast-proxy.conf"), proxyConfig, "utf8");

  return NextResponse.json({ ok: true, stations: stations.length });
}
