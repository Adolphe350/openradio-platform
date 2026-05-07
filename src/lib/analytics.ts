export type ListenerMetricSnapshot = {
  currentListeners: number;
  peakListeners: number;
  totalListeningHours: number;
  uptimePercent: number;
  storageUsedMb: number;
  sampledAt: Date;
};

export type MetricSource = "live" | "sample";

type ResolveMetricInput = {
  stationId: string;
  trackCount: number;
  playlistCount: number;
  createdAt: Date;
  metric: ListenerMetricSnapshot | null;
};

function hashString(value: string) {
  let hash = 17;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildSampleMetric(input: Omit<ResolveMetricInput, "metric">): ListenerMetricSnapshot {
  const seed = hashString(input.stationId);
  const baseline = 10 + (seed % 26) + input.trackCount * 2 + input.playlistCount * 3;
  const currentListeners = clamp(baseline, 6, 220);
  const peakListeners = clamp(currentListeners + 12 + (seed % 34), currentListeners + 3, 390);
  const listeningHours = Number((currentListeners * 5.4 + peakListeners * 1.2).toFixed(1));
  const uptimePercent = Number((96 + (seed % 35) / 10).toFixed(1));
  const storageUsedMb = Number((input.trackCount * 12 + input.playlistCount * 22 + (seed % 120)).toFixed(0));
  const sampledAt = new Date(Math.max(input.createdAt.getTime(), Date.now() - 1000 * 60 * 60));

  return {
    currentListeners,
    peakListeners,
    totalListeningHours: listeningHours,
    uptimePercent,
    storageUsedMb,
    sampledAt
  };
}

export function resolveStationMetric(input: ResolveMetricInput) {
  if (input.metric) {
    return {
      source: "live" as MetricSource,
      metric: input.metric
    };
  }

  return {
    source: "sample" as MetricSource,
    metric: buildSampleMetric({
      stationId: input.stationId,
      trackCount: input.trackCount,
      playlistCount: input.playlistCount,
      createdAt: input.createdAt
    })
  };
}

export function metricSourceLabel(source: MetricSource) {
  return source === "live" ? "Live" : "Sample";
}
