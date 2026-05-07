import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveStationMetric } from "@/lib/analytics";

export const metadata = { title: "Analytics – OpenRadio" };

export default async function AnalyticsPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
      _count: { select: { tracks: true, playlists: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = stations.map((s) => ({
    s,
    m: resolveStationMetric({
      stationId: s.id,
      trackCount: s._count.tracks,
      playlistCount: s._count.playlists,
      createdAt: s.createdAt,
      metric: s.metrics[0]
        ? {
            currentListeners: s.metrics[0].currentListeners,
            peakListeners: s.metrics[0].peakListeners,
            totalListeningHours: s.metrics[0].totalListeningHours,
            uptimePercent: s.metrics[0].uptimePercent,
            storageUsedMb: s.metrics[0].storageUsedMb,
            sampledAt: s.metrics[0].sampledAt,
          }
        : null,
    }),
  }));

  const totals = {
    listeners: rows.reduce((n, r) => n + r.m.metric.currentListeners, 0),
    peak:      rows.reduce((n, r) => n + r.m.metric.peakListeners, 0),
    hours:     rows.reduce((n, r) => n + r.m.metric.totalListeningHours, 0),
    active:    stations.filter((s) => s.status === "ACTIVE").length,
  };

  const statusColors: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: "#ecfdf5", color: "#059669" },
    PAUSED: { bg: "#fffbeb", color: "#d97706" },
    DRAFT:  { bg: "var(--bg-page)", color: "var(--text-muted)" },
  };

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Analytics</h1>
          <p className="dash-page-sub">Listener stats across all your stations.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
        {[
          { label: "Current Listeners", value: totals.listeners, icon: "👂" },
          { label: "Peak Listeners",    value: totals.peak,      icon: "📈" },
          { label: "Listening Hours",   value: totals.hours.toFixed(1) + "h", icon: "⏱️" },
          { label: "Active Stations",   value: totals.active,    icon: "📡" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Per-station table */}
      {stations.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">📡</span>
          <h3 style={{ margin: 0 }}>No stations yet</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Create a station to start seeing analytics.</p>
          <Link href="/dashboard/stations/new" className="btn btn-primary">Create Station</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>Per-station breakdown</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ textAlign: "center" }}>Listeners</th>
                  <th style={{ textAlign: "center" }}>Peak</th>
                  <th style={{ textAlign: "center" }}>Hours</th>
                  <th style={{ textAlign: "center" }}>Uptime</th>
                  <th style={{ textAlign: "center" }}>Storage</th>
                  <th style={{ textAlign: "center" }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, m }) => {
                  const sc = statusColors[s.status] ?? statusColors.DRAFT;
                  return (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/dashboard/stations/${s.id}`} style={{ color: "var(--brand)", fontWeight: 600, fontSize: "0.875rem" }}>
                          {s.name}
                        </Link>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.genre ?? "Mixed"}</p>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ padding: "0.18rem 0.6rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, background: sc.bg, color: sc.color }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{m.metric.currentListeners}</td>
                      <td style={{ textAlign: "center" }}>{m.metric.peakListeners}</td>
                      <td style={{ textAlign: "center" }}>{m.metric.totalListeningHours.toFixed(1)}h</td>
                      <td style={{ textAlign: "center" }}>{m.metric.uptimePercent.toFixed(1)}%</td>
                      <td style={{ textAlign: "center" }}>{m.metric.storageUsedMb.toFixed(0)} MB</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: m.source === "live" ? "var(--green)" : "var(--text-muted)" }}>
                          {m.source}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ padding: "0.75rem 1.25rem", margin: 0, fontSize: "0.75rem", color: "var(--text-light)", borderTop: "1px solid var(--border)" }}>
            Data marked &ldquo;sample&rdquo; is seeded from station metadata until live Icecast metrics ingestion is configured.
          </p>
        </div>
      )}

      {/* Chart placeholder */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem" }}>Listener History</h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Historical listener charts will populate here as your Icecast server reports data.
        </p>
        <div style={{
          height: 160, borderRadius: "var(--radius-lg)",
          background: "var(--bg-page)", border: "1.5px dashed var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "0.5rem",
        }}>
          <span style={{ fontSize: "2rem" }}>📊</span>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>Charts will appear once data is ingested</p>
        </div>
      </div>
    </div>
  );
}
