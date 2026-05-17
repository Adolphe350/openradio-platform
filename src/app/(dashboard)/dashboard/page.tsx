import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";
import { fetchIcecastStatus, findIcecastSource, normalizeIcecastSources } from "@/lib/icecast";
import { DashboardStats } from "./dashboard-stats";

export const metadata = {
  title: "Dashboard - OpenRadio",
};

interface DataPoint {
  label: string;
  value: number;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function emptyWeekBuckets(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      key: dayKey(date),
      label: formatDayLabel(date),
      value: 0,
    };
  });
}

function getStationColor(id: string): string {
  const colors = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  ];
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default async function DashboardPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: { tracks: true, playlists: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalStations = stations.length;
  const activeStations = stations.filter((s) => s.status === "ACTIVE").length;
  const totalTracks = stations.reduce((sum, s) => sum + s._count.tracks, 0);
  const stationIds = stations.map((station) => station.id);

  const today = startOfUtcDay(new Date());
  const thisWeekStart = new Date(today);
  thisWeekStart.setUTCDate(today.getUTCDate() - 6);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);

  const [icecastStatus, metrics] = await Promise.all([
    fetchIcecastStatus(3500),
    stationIds.length > 0
      ? db.listenerMetric.findMany({
          where: {
            stationId: { in: stationIds },
            sampledAt: { gte: lastWeekStart },
          },
          orderBy: { sampledAt: "asc" },
          select: {
            stationId: true,
            sampledAt: true,
            currentListeners: true,
            peakListeners: true,
            uptimePercent: true,
          },
        })
      : [],
  ]);

  const sources = normalizeIcecastSources(icecastStatus?.icestats?.source);
  const liveByStation = new Map(
    stations.map((station) => {
      const source = findIcecastSource(sources, station.mountPath);
      return [
        station.id,
        {
          currentListeners: source?.listeners ?? 0,
          peakListeners: source?.listener_peak ?? source?.listeners ?? 0,
          isLive: Boolean(source),
        },
      ];
    }),
  );

  const latestMetricByStation = new Map<string, (typeof metrics)[number]>();
  for (const metric of metrics) {
    latestMetricByStation.set(metric.stationId, metric);
  }

  const getStationListenerCount = (stationId: string) => {
    const live = liveByStation.get(stationId)?.currentListeners;
    if (typeof live === "number" && live > 0) return live;
    return latestMetricByStation.get(stationId)?.currentListeners ?? 0;
  };

  const currentListeners = stations.reduce((sum, station) => sum + getStationListenerCount(station.id), 0);

  const thisWeekBuckets = emptyWeekBuckets(thisWeekStart);
  const lastWeekBuckets = emptyWeekBuckets(lastWeekStart);
  const thisWeekMap = new Map(thisWeekBuckets.map((bucket) => [bucket.key, bucket]));
  const lastWeekMap = new Map(lastWeekBuckets.map((bucket) => [bucket.key, bucket]));

  for (const metric of metrics) {
    const key = dayKey(metric.sampledAt);
    const thisBucket = thisWeekMap.get(key);
    if (thisBucket) {
      thisBucket.value += metric.currentListeners;
      continue;
    }

    const lastBucket = lastWeekMap.get(key);
    if (lastBucket) {
      lastBucket.value += metric.currentListeners;
    }
  }

  const todayBucket = thisWeekMap.get(dayKey(today));
  if (todayBucket && currentListeners > todayBucket.value) {
    todayBucket.value = currentListeners;
  }

  const thisWeek: DataPoint[] = thisWeekBuckets.map(({ label, value }) => ({ label, value }));
  const lastWeek: DataPoint[] = lastWeekBuckets.map(({ label, value }) => ({ label, value }));
  const thisWeekTotal = thisWeek.reduce((sum, point) => sum + point.value, 0);
  const lastWeekTotal = lastWeek.reduce((sum, point) => sum + point.value, 0);
  const pctChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

  const statCards = [
    {
      label: "Total Stations",
      value: totalStations.toString(),
      change: null,
    },
    {
      label: "Live Now",
      value: activeStations.toString(),
      change: null,
    },
    {
      label: "Total Tracks",
      value: totalTracks.toLocaleString(),
      change: null,
    },
    {
      label: "Current Listeners",
      value: currentListeners.toLocaleString(),
      change: null,
    },
  ];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "var(--text)", marginBottom: "8px", letterSpacing: "-0.02em" }}>
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>
            Your stations overview with your stations today
          </p>
        </div>
        <Link href="/dashboard/stations/new" className="btn btn-primary">
          New Station
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {stat.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text)", letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              {stat.change !== null && (
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: stat.change >= 0 ? "var(--green)" : "var(--red)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>{stat.change >= 0 ? "↑" : "↓"}</span>
                  <span>{Math.abs(stat.change).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "40px" }}>
        <DashboardStats
          thisWeek={thisWeek}
          lastWeek={lastWeek}
          thisWeekTotal={thisWeekTotal}
          lastWeekTotal={lastWeekTotal}
          pctChange={pctChange}
        />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text)", letterSpacing: "-0.01em" }}>
            Your Stations
          </h2>
          {stations.length > 0 && (
            <Link href="/dashboard/stations" style={{ color: "var(--brand)", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
              View All
            </Link>
          )}
        </div>

        {stations.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "60px 40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--bg-elevated)",
                border: "2px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                color: "var(--text-dim)",
              }}
            >
              ○
            </div>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
                No stations yet
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "24px", maxWidth: "400px" }}>
                Create your first radio station to start broadcasting. It only takes a minute to get started.
              </p>
              <Link href="/dashboard/stations/new" className="btn btn-primary">
                Create Your First Station
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
            {stations.map((station) => {
              const streamUrl = getPublicStreamUrl(station.id);
              const statusColors = {
                ACTIVE: { bg: "rgba(16, 185, 129, 0.1)", text: "var(--green)", border: "rgba(16, 185, 129, 0.3)" },
                PAUSED: { bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" },
                DRAFT: { bg: "rgba(107, 114, 128, 0.1)", text: "#9ca3af", border: "rgba(107, 114, 128, 0.3)" },
              };
              const statusStyle = statusColors[station.status as keyof typeof statusColors] || statusColors.DRAFT;

              return (
                <div key={station.id} className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ height: "6px", background: getStationColor(station.id) }} />

                  <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text)", letterSpacing: "-0.01em" }}>
                          {station.name}
                        </h3>
                        <div
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          {station.status}
                        </div>
                      </div>
                      {station.genre && (
                        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          {station.genre}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                          Listeners
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                          {getStationListenerCount(station.id)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                          Tracks
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                          {station._count.tracks}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                          Uptime
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                          {`${Math.round(latestMetricByStation.get(station.id)?.uptimePercent ?? (liveByStation.get(station.id)?.isLive ? 100 : 0))}%`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "8px" }}>
                      <Link
                        href={`/dashboard/stations/${station.id}`}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/stations/${station.slug}`}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Public Page
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
