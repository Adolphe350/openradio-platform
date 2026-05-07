import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

type IcecastSource = {
  mount: string;
  listeners: number;
  listener_peak: number;
  title?: string;
  "song"?: string;
  server_name?: string;
};

type IcecastStatus = {
  icestats?: {
    source?: IcecastSource | IcecastSource[];
  };
};

function normalizeSources(raw: IcecastSource | IcecastSource[] | undefined): IcecastSource[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

// Cache Icecast responses for 10 s to avoid hammering it
const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function fetchIcecastStatus(): Promise<IcecastStatus | null> {
  const key = "icecast-status";
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as IcecastStatus;
  }

  try {
    const base = `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}`;
    const res = await fetch(`${base}/status-json.xsl`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(key, { data, expiresAt: Date.now() + 10_000 });
    return data as IcecastStatus;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const mount = req.nextUrl.searchParams.get("mount");
  if (!mount) return NextResponse.json({ error: "mount required" }, { status: 400 });

  const status = await fetchIcecastStatus();
  const sources = normalizeSources(status?.icestats?.source);

  const normalizedMount = mount.startsWith("/") ? mount : `/${mount}`;
  const src = sources.find(
    (s) => s.mount === normalizedMount || s.mount === normalizedMount.replace(/^\//, "")
  );

  return NextResponse.json({
    title: src?.title ?? src?.["song"] ?? null,
    listeners: src?.listeners ?? 0,
    live: !!src,
  });
}
