import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveStationMetric } from "@/lib/analytics";
import { getPublicStreamUrl } from "@/lib/stream";
import { DashboardStats } from "./dashboard-stats";

export const metadata = { title: "Dashboard – OpenRadio" };

function stationGradient(id: string) {
  const h1 = (id.charCodeAt(0) * 47 + id.charCodeAt(1) * 31) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg,hsl(${h1},55%,48%),hsl(${h2},60%,35%))`;
}

export default async function DashboardPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      _count: { select: { tracks: true, playlists: true } },
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const stationsWithMetrics = stations.map((s) => ({
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

  const stationIds = stations.map((s) => s.id);

  // Weekly listener metrics for stats cards
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 3600 * 1000);

  const [thisWeekMetrics, lastWeekMetrics] = await Promise.all([
    stationIds.length > 0
      ? db.listenerMetric.findMany({
          where: { stationId: { in: stationIds }, sampledAt: { gte: weekAgo } },
          select: { sampledAt: true, currentListeners: true },
          orderBy: { sampledAt: "asc" },
        })
      : Promise.resolve([]),
    stationIds.length > 0
      ? db.listenerMetric.findMany({
          where: { stationId: { in: stationIds }, sampledAt: { gte: twoWeeksAgo, lt: weekAgo } },
          select: { sampledAt: true, currentListeners: true },
          orderBy: { sampledAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const thisWeekTotal = thisWeekMetrics.reduce((s, m) => s + m.currentListeners, 0);
  const lastWeekTotal = lastWeekMetrics.reduce((s, m) => s + m.currentListeners, 0);
  const pctChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

  // Build daily chart data for last 7 days
  const dayMap = new Map<string, number>();
  for (const m of thisWeekMetrics) {
    const day = m.sampledAt.toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + m.currentListeners);
  }
  const prevDayMap = new Map<string, number>();
  for (const m of lastWeekMetrics) {
    const shifted = new Date(m.sampledAt.getTime() + 7 * 24 * 3600 * 1000);
    const day = shifted.toISOString().slice(0, 10);
    prevDayMap.set(day, (prevDayMap.get(day) ?? 0) + m.currentListeners);
  }

  const chartThisWeek: { label: string; value: number }[] = [];
  const chartLastWeek: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
    const day = d.toISOString().slice(0, 10);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    chartThisWeek.push({ label, value: dayMap.get(day) ?? 0 });
    chartLastWeek.push({ label, value: prevDayMap.get(day) ?? 0 });
  }

  // Sessions = metric sample points where listeners > 0 (approximation)
  const sessions = thisWeekMetrics.filter((m) => m.currentListeners > 0).length;

  const totalListeners = stationsWithMetrics.reduce((n, x) => n + x.m.metric.currentListeners, 0);
  const totalTracks    = stations.reduce((n, s) => n + s._count.tracks, 0);
  const totalPlaylists = stations.reduce((n, s) => n + s._count.playlists, 0);
  const activeCount    = stations.filter((s) => s.status === "ACTIVE").length;
  const hasActive      = activeCount > 0;

  const checklist = [
    { label: "Create a station",    done: stations.length > 0,  hint: `${stations.length} station${stations.length !== 1 ? "s" : ""}` },
    { label: "Connect an encoder",  done: hasActive,             hint: hasActive ? "Station is active" : "Set status to ACTIVE" },
    { label: "Add tracks",          done: totalTracks > 0,       hint: `${totalTracks} track${totalTracks !== 1 ? "s" : ""}` },
    { label: "Create a playlist",   done: totalPlaylists > 0,    hint: `${totalPlaylists} playlist${totalPlaylists !== 1 ? "s" : ""}` },
    { label: "Go live",             done: hasActive,             hint: hasActive ? "You're on air!" : "Activate a station" },
  ];
  const done = checklist.filter((c) => c.done).length;

  return (
    <div className="dash-page">
      {/* Header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="dash-page-sub">Manage your stations, analytics, and broadcasts from here.</p>
        </div>
        <Link href="/dashboard/stations/new" className="btn btn-primary">
          + Create Station
        </Link>
      </div>

      {/* Weekly stats cards */}
      <div className="mobile-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
        {[
          { label: "Total Stations", value: stations.length, sub: `${activeCount} active` },
          { label: "Current Listeners", value: totalListeners, sub: "across all stations" },
          { label: "Listeners This Week", value: thisWeekTotal.toLocaleString(), sub: pctChange !== 0 ? `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}% vs last week` : "vs last week", pct: pctChange },
          { label: "Sessions This Week", value: sessions, sub: "metric samples w/ listeners" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div style={{ fontSize: "0.75rem", color: "pct" in stat && stat.pct !== undefined ? (stat.pct >= 0 ? "var(--green)" : "#ef4444") : "var(--text-light)", marginTop: "0.15rem" }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Listener trend chart */}
      <DashboardStats
        thisWeek={chartThisWeek}
        lastWeek={chartLastWeek}
        thisWeekTotal={thisWeekTotal}
        lastWeekTotal={lastWeekTotal}
        pctChange={pctChange}
      />

      {/* Onboarding checklist */}
      {done < checklist.length && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: "1rem", margin: "0 0 0.15rem" }}>First broadcast checklist</h2>
              <p style={{ margin: 0, fontSize: "0.825rem", color: "var(--text-muted)" }}>
                {done}/{checklist.length} steps complete
              </p>
            </div>
            <div className="mobile-full-actions" style={{ display: "flex", gap: "0.5rem" }}>
              <Link href="/streaming" className="btn btn-secondary btn-sm">Streaming guide</Link>
              <Link href="/automation" className="btn btn-secondary btn-sm">AutoDJ guide</Link>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ height: 5, background: "var(--border)", borderRadius: 999, marginBottom: "1rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(done / checklist.length) * 100}%`, background: "var(--brand)", borderRadius: 999, transition: "width 0.4s" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.6rem" }}>
            {checklist.map((c) => (
              <div
                key={c.label}
                className="checklist-item"
                style={{ background: c.done ? "#ecfdf5" : undefined, borderColor: c.done ? "#a7f3d0" : undefined }}
              >
                <div className={`checklist-circle${c.done ? " done" : ""}`}>{c.done ? "✓" : ""}</div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.825rem", fontWeight: 600 }}>{c.label}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stations grid */}
      <div>
        <div className="section-row" style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 700 }}>Your Stations</h2>
          <Link href="/dashboard/analytics" style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 600 }}>
            View analytics →
          </Link>
        </div>

        {stations.length === 0 ? (
          <div className="card empty-state">
            <span className="empty-icon">📡</span>
            <h3 style={{ margin: 0 }}>No stations yet</h3>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "38ch" }}>
              Create your first station to get encoder credentials and start broadcasting live.
            </p>
            <Link href="/dashboard/stations/new" className="btn btn-primary">Create your first station</Link>
          </div>
        ) : (
          <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "1rem" }}>
            {stationsWithMetrics.map(({ s, m }) => (
              <div key={s.id} className="card" style={{ overflow: "hidden" }}>
                {/* Color banner */}
                <div style={{ height: 72, background: stationGradient(s.id), position: "relative" }}>
                  {/* Status pill */}
                  <span
                    style={{
                      position: "absolute", top: 10, right: 10,
                      padding: "0.18rem 0.6rem", borderRadius: 999,
                      fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase",
                      background: s.status === "ACTIVE" ? "rgba(16,185,129,0.9)" : s.status === "PAUSED" ? "rgba(245,158,11,0.9)" : "rgba(0,0,0,0.4)",
                      color: "#fff",
                    }}
                  >
                    {s.status}
                  </span>

                  {/* Logo overlap */}
                  <div
                    style={{
                      position: "absolute", bottom: -18, left: 16,
                      width: 44, height: 44, borderRadius: 10,
                      border: "3px solid var(--bg)",
                      background: s.logoUrl ? undefined : stationGradient(s.id),
                      overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.3rem",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {s.logoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s.logoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "📻"}
                  </div>
                </div>

                <div style={{ padding: "1.4rem 1rem 1rem" }}>
                  <h3 style={{ margin: "0 0 0.2rem", fontSize: "0.975rem" }}>{s.name}</h3>
                  <p style={{ margin: "0 0 0.85rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {s.genre ?? "Radio"}{s.country ? ` · ${s.country}` : ""}
                  </p>

                  {/* Mini stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
                    {[
                      { label: "Listeners", value: m.metric.currentListeners },
                      { label: "Tracks", value: s._count.tracks },
                      { label: "Uptime", value: `${m.metric.uptimePercent.toFixed(0)}%` },
                    ].map((st) => (
                      <div key={st.label} style={{ textAlign: "center", background: "var(--bg-page)", borderRadius: 8, padding: "0.5rem 0.25rem" }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: "1rem" }}>{st.value}</p>
                        <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--text-muted)" }}>{st.label}</p>
                      </div>
                    ))}
                  </div>

                  <p style={{ margin: "0 0 0.9rem", fontSize: "0.75rem", color: "var(--text-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getPublicStreamUrl(s.mountPath)}
                  </p>

                  <div className="mobile-full-actions" style={{ display: "flex", gap: "0.5rem" }}>
                    <Link href={`/dashboard/stations/${s.id}`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                      Manage
                    </Link>
                    <Link href={`/stations/${s.slug}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      Public page
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
