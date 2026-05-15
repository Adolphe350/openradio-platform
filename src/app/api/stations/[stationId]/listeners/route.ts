import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type IcecastSource = {
  mount: string;
  listeners: number;
  listener_peak: number;
};

type IcecastStatus = {
  icestats?: {
    source?: IcecastSource | IcecastSource[];
  };
};

async function getListenerCount(mountPath: string): Promise<number> {
  try {
    const base = `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}`;
    const res = await fetch(`${base}/status-json.xsl`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const status = (await res.json()) as IcecastStatus;
    const raw = status?.icestats?.source;
    const sources: IcecastSource[] = !raw ? [] : Array.isArray(raw) ? raw : [raw];
    const mount = mountPath.startsWith("/") ? mountPath : `/${mountPath}`;
    const src = sources.find((s) => s.mount === mount || s.mount === mount.replace(/^\//, ""));
    return src?.listeners ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const { stationId } = await params;

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, mountPath: true },
  });
  if (!station) {
    return new Response("Station not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      req.signal.addEventListener("abort", () => { closed = true; });

      // Fetch last 24h metrics for history
      const history = await db.listenerMetric.findMany({
        where: { stationId },
        orderBy: { sampledAt: "asc" },
        take: 288,
        select: { sampledAt: true, currentListeners: true },
      });

      const historyData = JSON.stringify(
        history.map((m) => ({ t: m.sampledAt.toISOString(), v: m.currentListeners }))
      );

      const initialCount = await getListenerCount(station.mountPath);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ listeners: initialCount, history: JSON.parse(historyData) })}\n\n`));

      // Poll every 10 seconds
      while (!closed) {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        if (closed) break;
        try {
          const count = await getListenerCount(station.mountPath);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ listeners: count })}\n\n`));
        } catch {
          // ignore
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
