export type ListenerMetricSnapshot = {
  currentListeners: number;
  peakListeners: number;
  totalListeningHours: number;
  uptimePercent: number;
  storageUsedMb: number;
  sampledAt: Date;
};

export type MetricSource = "live" | "none";
export type PublicTrend = "up" | "steady" | "down";

type ResolveMetricInput = {
  stationId: string;
  trackCount: number;
  playlistCount: number;
  createdAt: Date;
  metric: ListenerMetricSnapshot | null;
};

type PublicPopularityInput = ResolveMetricInput & {
  status?: "ACTIVE" | "PAUSED" | "DRAFT" | string;
};

export type PublicPopularitySnapshot = {
  listenersNow: number;
  weeklyReach: number;
  trend: PublicTrend;
  confidence: "measured" | "estimated";
  publicUptimePercent: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function emptyMetric(createdAt: Date): ListenerMetricSnapshot {
  return {
    currentListeners: 0,
    peakListeners: 0,
    totalListeningHours: 0,
    uptimePercent: 0,
    storageUsedMb: 0,
    sampledAt: createdAt,
  };
}

export function resolveStationMetric(input: ResolveMetricInput) {
  if (input.metric) {
    return {
      source: "live" as MetricSource,
      metric: input.metric,
    };
  }

  return {
    source: "none" as MetricSource,
    metric: emptyMetric(input.createdAt),
  };
}

export function buildPublicPopularity(input: PublicPopularityInput): PublicPopularitySnapshot {
  const measuredListeners = clamp(input.metric?.currentListeners ?? 0, 0, 1200);
  const measuredPeak = clamp(input.metric?.peakListeners ?? measuredListeners, measuredListeners, 1200);
  const metricAgeMinutes = input.metric
    ? (Date.now() - input.metric.sampledAt.getTime()) / (1000 * 60)
    : Number.POSITIVE_INFINITY;
  const hasFreshMetric = Boolean(input.metric && metricAgeMinutes <= 120);

  const listenersNow = hasFreshMetric ? measuredListeners : 0;
  const weeklyReach = hasFreshMetric
    ? Math.max(listenersNow, Math.round(Math.max(measuredPeak, listenersNow) * 12))
    : 0;

  let trend: PublicTrend = "steady";
  if (hasFreshMetric && measuredPeak > 0) {
    if (listenersNow >= Math.max(1, measuredPeak * 0.72)) {
      trend = "up";
    } else if (listenersNow <= Math.max(2, measuredPeak * 0.35)) {
      trend = "down";
    }
  }

  return {
    listenersNow,
    weeklyReach,
    trend,
    confidence: hasFreshMetric ? "measured" : "estimated",
    publicUptimePercent: hasFreshMetric ? clamp(input.metric?.uptimePercent ?? 0, 0, 100) : 0,
  };
}


export function metricSourceLabel(source: MetricSource) {
  return source === "live" ? "Live metrics" : "No live metrics yet";
}
