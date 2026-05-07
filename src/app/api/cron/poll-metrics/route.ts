import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

// This route is designed to be called by an external cron (docker-compose curl cron
// or Vercel cron). Protected by METRICS_POLL_SECRET header or query param.

type IcecastSource = {
  mount: string;
  listeners: number;
  listener_peak: number;
  title?: string;
};

type IcecastStatus = {
  icestats?: { source?: IcecastSource | IcecastSource[] };
};

function normalizeSources(raw: IcecastSource | IcecastSource[] | undefined): IcecastSource[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function fetchIcecastStatus(): Promise<IcecastStatus | null> {
  try {
    const res = await fetch(
      `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}/status-json.xsl`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000), cache: "no-store" }
    );
    if (!res.ok) return null;
    return (await res.json()) as IcecastStatus;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Accept secret via header OR query param (for simple curl cron usage)
  const secret =
    req.headers.get("x-poll-secret") ??
    req.nextUrl.searchParams.get("secret") ??
    "";
  if (secret !== env.METRICS_POLL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await fetchIcecastStatus();
  if (!status) {
    return NextResponse.json({ ok: false, reason: "Icecast unreachable" });
  }

  const sources = normalizeSources(status?.icestats?.source);

  const stations = await db.station.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    select: {
      id: true,
      mountPath: true,
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
    },
  });

  let updated = 0;

  for (const station of stations) {
    const mount = station.mountPath.startsWith("/")
      ? station.mountPath
      : `/${station.mountPath}`;
    const src = sources.find(
      (s) => s.mount === mount || s.mount === mount.replace(/^\//, "")
    );

    const currentListeners = src?.listeners ?? 0;
    const prevPeak = station.metrics[0]?.peakListeners ?? 0;
    const peakListeners = Math.max(prevPeak, currentListeners);
    const prevHours = station.metrics[0]?.totalListeningHours ?? 0;
    const totalListeningHours = +(prevHours + (currentListeners * 5) / 60).toFixed(2);
    const uptimePercent = src
      ? 100
      : Math.max((station.metrics[0]?.uptimePercent ?? 95) - 1, 0);

    await db.listenerMetric.create({
      data: {
        stationId: station.id,
        currentListeners,
        peakListeners,
        totalListeningHours,
        uptimePercent,
        storageUsedMb: station.metrics[0]?.storageUsedMb ?? 0,
      },
    });

    // Prune old samples — keep last 288 (24 h at 5-min intervals)
    const old = await db.listenerMetric.findMany({
      where: { stationId: station.id },
      orderBy: { sampledAt: "desc" },
      skip: 288,
      select: { id: true },
    });
    if (old.length > 0) {
      await db.listenerMetric.deleteMany({ where: { id: { in: old.map((r) => r.id) } } });
    }

    updated++;
  }

  return NextResponse.json({ ok: true, updated, mountsLive: sources.map((s) => s.mount) });
}
