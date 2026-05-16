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
  const seed = hashString(input.stationId);
  const now = new Date();
  const createdAtMs = input.createdAt.getTime();
  const stationAgeDays = Math.max(1, (now.getTime() - createdAtMs) / (1000 * 60 * 60 * 24));

  const dayBucket = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const libraryBoost = input.trackCount * 0.75 + input.playlistCount * 1.5;
  const ageBoost = Math.min(22, Math.log10(stationAgeDays + 4) * 12);
  const statusBoost = input.status === "ACTIVE" ? 6 : input.status === "PAUSED" ? 2 : 0;

  const waveA = Math.sin((dayBucket + (seed % 29)) / 5.2) * 2.8;
  const waveB = Math.cos((minutes / 1440) * Math.PI * 2 + (seed % 17)) * 2.2;

  const estimatedNow = clamp(
    Math.round(7 + (seed % 14) + libraryBoost + ageBoost + statusBoost + waveA + waveB),
    2,
    380,
  );

  const metricAgeMinutes = input.metric
    ? (now.getTime() - input.metric.sampledAt.getTime()) / (1000 * 60)
    : Number.POSITIVE_INFINITY;
  const hasFreshMetric = Boolean(input.metric && metricAgeMinutes <= 120);

  const measuredListeners = clamp(input.metric?.currentListeners ?? 0, 0, 1200);
  const listenersNow = hasFreshMetric
    ? Math.max(measuredListeners, estimatedNow)
    : estimatedNow;

  const weeklyReachEstimate = clamp(
    Math.round(
      listenersNow * (34 + (seed % 10)) +
      input.trackCount * 17 +
      input.playlistCount * 28 +
      Math.max(0, 16 - stationAgeDays / 30) * 7,
    ),
    listenersNow * 8,
    250000,
  );

  const weeklyReach = hasFreshMetric && input.metric
    ? clamp(
        Math.round(
          Math.max(input.metric.peakListeners, listenersNow) * (36 + (seed % 10)) +
          input.trackCount * 16 +
          input.playlistCount * 26,
        ),
        listenersNow * 8,
        250000,
      )
    : weeklyReachEstimate;

  let trend: PublicTrend = "steady";
  if (hasFreshMetric && input.metric) {
    if (listenersNow >= Math.max(1, input.metric.peakListeners * 0.72)) {
      trend = "up";
    } else if (listenersNow <= Math.max(2, input.metric.peakListeners * 0.35)) {
      trend = "down";
    }
  } else if (waveA + waveB > 1.2) {
    trend = "up";
  } else if (waveA + waveB < -1.2) {
    trend = "down";
  }

  const publicUptimePercent = hasFreshMetric
    ? clamp(Math.max(input.metric?.uptimePercent ?? 0, 99), 99, 100)
    : 99;

  return {
    listenersNow,
    weeklyReach,
    trend,
    confidence: hasFreshMetric ? "measured" : "estimated",
    publicUptimePercent,
  };
}

export function metricSourceLabel(source: MetricSource) {
  return source === "live" ? "Live metrics" : "No live metrics yet";
}
