import { env } from "@/lib/env";

export type ListenerMetricSnapshot = {
  currentListeners: number;
  peakListeners: number;
  totalListeningHours: number;
  uptimePercent: number;
  storageUsedMb: number;
  sampledAt: Date;
};

export type MetricSource = "live" | "icecast" | "sample";

type ResolveMetricInput = {
  stationId: string;
  mountPath: string;
  trackCount: number;
  playlistCount: number;
  createdAt: Date;
  metric: ListenerMetricSnapshot | null;
};

type ResolveMetricSyncInput = {
  stationId: string;
  trackCount: number;
  playlistCount: number;
  createdAt: Date;
  metric: ListenerMetricSnapshot | null;
};

async function fetchIcecastListeners(mountPath: string): Promise<{ listeners: number; peak: number } | null> {
  try {
    const url = `http://${env.STREAM_SOURCE_HOST}:${env.ICECAST_SOURCE_PORT}/status-json.xsl`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const source = data?.icestats?.source;
    if (!source) return null;

    const sources = Array.isArray(source) ? source : [source];
    const match = sources.find((s: Record<string, unknown>) => {
      const listenUrl = String(s.listenurl ?? "");
      return listenUrl.endsWith(mountPath) || listenUrl.endsWith(mountPath.replace(/^\//, ""));
    });

    if (!match) return null;

    return {
      listeners: Number(match.listeners ?? 0),
      peak: Number(match.listener_peak ?? match.listeners ?? 0),
    };
  } catch {
    return null;
  }
}

export async function resolveStationMetric(input: ResolveMetricInput) {
  if (input.metric) {
    return {
      source: "live" as MetricSource,
      metric: input.metric,
    };
  }

  const icecast = await fetchIcecastListeners(input.mountPath);
  if (icecast) {
    return {
      source: "icecast" as MetricSource,
      metric: {
        currentListeners: icecast.listeners,
        peakListeners: icecast.peak,
        totalListeningHours: 0,
        uptimePercent: 99.9,
        storageUsedMb: 0,
        sampledAt: new Date(),
      },
    };
  }

  return {
    source: "sample" as MetricSource,
    metric: {
      currentListeners: 0,
      peakListeners: 0,
      totalListeningHours: 0,
      uptimePercent: 0,
      storageUsedMb: 0,
      sampledAt: new Date(),
    },
  };
}

export function resolveStationMetricSync(input: ResolveMetricSyncInput) {
  if (input.metric) {
    return {
      source: "live" as MetricSource,
      metric: input.metric,
    };
  }

  return {
    source: "sample" as MetricSource,
    metric: {
      currentListeners: 0,
      peakListeners: 0,
      totalListeningHours: 0,
      uptimePercent: 0,
      storageUsedMb: 0,
      sampledAt: new Date(),
    },
  };
}

export function metricSourceLabel(source: MetricSource) {
  if (source === "live") return "Live";
  if (source === "icecast") return "Icecast";
  return "Offline";
}
