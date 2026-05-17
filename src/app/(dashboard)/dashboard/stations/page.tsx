import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchIcecastStatus, findIcecastSource, normalizeIcecastSources } from "@/lib/icecast";

export const metadata = { title: "Stations – OpenRadio" };

export default async function StationsPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tracks: true, playlists: true } },
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
    },
  });

  const icecastStatus = await fetchIcecastStatus(3500);
  const sources = normalizeIcecastSources(icecastStatus?.icestats?.source);

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Stations</h1>
          <p className="dash-page-sub">Manage your live stations, AutoDJ tracks, schedules, and stream settings.</p>
        </div>
        <Link href="/dashboard/stations/new" className="btn btn-primary">
          + Create Station
        </Link>
      </div>

      {stations.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center", display: "grid", gap: "1rem", justifyItems: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem" }}>📻</div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>No stations yet</h2>
            <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)" }}>Create your first station and start broadcasting.</p>
          </div>
          <Link href="/dashboard/stations/new" className="btn btn-primary">Create Station</Link>
        </div>
      ) : (
        <div className="grid-auto-fit" style={{ gap: "1rem" }}>
          {stations.map((station) => {
            const source = findIcecastSource(sources, station.mountPath);
            const listeners = source?.listeners ?? station.metrics[0]?.currentListeners ?? 0;
            const uptime = Math.round(station.metrics[0]?.uptimePercent ?? (source ? 100 : 0));

            return (
              <article key={station.id} className="card" style={{ padding: "1.25rem", display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: "1.15rem", overflowWrap: "anywhere" }}>{station.name}</h2>
                    <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>{station.mountPath}</p>
                  </div>
                  <span className={`status-badge ${station.status.toLowerCase()}`}>{station.status}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.75rem" }}>
                  <div>
                    <div className="stat-label">Listeners</div>
                    <strong>{listeners}</strong>
                  </div>
                  <div>
                    <div className="stat-label">Tracks</div>
                    <strong>{station._count.tracks}</strong>
                  </div>
                  <div>
                    <div className="stat-label">Uptime</div>
                    <strong>{uptime}%</strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <Link href={`/dashboard/stations/${station.id}`} className="btn btn-primary" style={{ flex: "1 1 140px" }}>Manage</Link>
                  <Link href={`/stations/${station.slug}`} className="btn btn-secondary" style={{ flex: "1 1 140px" }}>Public Page</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
