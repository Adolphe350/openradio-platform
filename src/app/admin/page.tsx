import Link from "next/link";

import { requireSuperAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata = { title: "Super Admin Overview – OpenRadio" };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default async function AdminOverviewPage() {
  await requireSuperAdmin();

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

  const [
    totalUsers,
    totalStations,
    activeStations,
    pausedStations,
    draftStations,
    totalTracks,
    totalPlaylists,
    recentUsers,
    recentStations,
    latestMetrics,
    weekMetrics,
  ] = await Promise.all([
    db.user.count(),
    db.station.count(),
    db.station.count({ where: { status: "ACTIVE" } }),
    db.station.count({ where: { status: "PAUSED" } }),
    db.station.count({ where: { status: "DRAFT" } }),
    db.track.count(),
    db.playlist.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { _count: { select: { stations: true } } },
    }),
    db.station.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { tracks: true, playlists: true } },
        metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
      },
    }),
    db.listenerMetric.findMany({
      where: { sampledAt: { gte: dayAgo } },
      orderBy: { sampledAt: "desc" },
      include: { station: { select: { id: true, name: true, slug: true, status: true } } },
    }),
    db.listenerMetric.findMany({
      where: { sampledAt: { gte: weekAgo } },
      select: { currentListeners: true, peakListeners: true, totalListeningHours: true },
    }),
  ]);

  const latestByStation = new Map<string, (typeof latestMetrics)[number]>();
  for (const metric of latestMetrics) {
    if (!latestByStation.has(metric.stationId)) latestByStation.set(metric.stationId, metric);
  }
  const latestMetricRows = Array.from(latestByStation.values());
  const liveListeners = latestMetricRows.reduce((sum, metric) => sum + metric.currentListeners, 0);
  const liveStations = latestMetricRows.filter((metric) => metric.currentListeners > 0 || metric.station.status === "ACTIVE").length;
  const peakListeners = weekMetrics.reduce((peak, metric) => Math.max(peak, metric.peakListeners, metric.currentListeners), 0);
  const listeningHours = weekMetrics.reduce((sum, metric) => sum + metric.totalListeningHours, 0);

  const stats = [
    { label: "Live listeners now", value: liveListeners.toLocaleString(), sub: `${liveStations} live/active stations` },
    { label: "Radio stations", value: totalStations.toLocaleString(), sub: `${activeStations} active · ${pausedStations} paused · ${draftStations} draft` },
    { label: "User accounts", value: totalUsers.toLocaleString(), sub: "registered broadcasters" },
    { label: "Peak listeners", value: peakListeners.toLocaleString(), sub: "last 7 days" },
    { label: "Listening hours", value: listeningHours.toFixed(1), sub: "last 7 days" },
    { label: "Audio library", value: totalTracks.toLocaleString(), sub: `${totalPlaylists} playlists` },
  ];

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Super Admin</h1>
          <p className="dash-page-sub">Platform-wide listeners, radios, accounts, and operational health.</p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link href="/admin/stations" className="btn btn-secondary">Manage stations</Link>
          <Link href="/admin/users" className="btn btn-primary">Manage users</Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-light)", marginTop: "0.15rem" }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(280px,0.7fr)", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem", overflowX: "auto" }}>
          <div className="section-row" style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>Recent stations</h2>
            <Link href="/admin/stations" style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 600 }}>View all →</Link>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "0.6rem" }}>Station</th>
                <th style={{ padding: "0.6rem" }}>Owner</th>
                <th style={{ padding: "0.6rem" }}>Status</th>
                <th style={{ padding: "0.6rem" }}>Listeners</th>
                <th style={{ padding: "0.6rem" }}>Tracks</th>
              </tr>
            </thead>
            <tbody>
              {recentStations.map((station) => (
                <tr key={station.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.7rem 0.6rem" }}>
                    <Link href={`/admin/stations?query=${encodeURIComponent(station.slug)}`} style={{ fontWeight: 700, color: "var(--text)" }}>{station.name}</Link>
                    <div style={{ color: "var(--text-light)", fontSize: "0.75rem" }}>{station.slug}</div>
                  </td>
                  <td style={{ padding: "0.7rem 0.6rem" }}>{station.owner.name}<div style={{ color: "var(--text-light)", fontSize: "0.75rem" }}>{station.owner.email}</div></td>
                  <td style={{ padding: "0.7rem 0.6rem" }}><span className={`badge ${station.status === "ACTIVE" ? "badge-green" : station.status === "PAUSED" ? "badge-blue" : ""}`}>{station.status}</span></td>
                  <td style={{ padding: "0.7rem 0.6rem", fontWeight: 800 }}>{station.metrics[0]?.currentListeners ?? 0}</td>
                  <td style={{ padding: "0.7rem 0.6rem" }}>{station._count.tracks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <div className="section-row" style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>New users</h2>
            <Link href="/admin/users" style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 600 }}>View all →</Link>
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {recentUsers.map((user) => (
              <div key={user.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: 10 }}>
                <div style={{ fontWeight: 800 }}>{user.name}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", wordBreak: "break-all" }}>{user.email}</div>
                <div style={{ marginTop: "0.35rem", fontSize: "0.75rem", color: "var(--text-light)" }}>{user._count.stations} stations · joined {formatDate(user.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
