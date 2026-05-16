import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";
import { DashboardStats } from "./dashboard-stats";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: {
          tracks: true,
          playlists: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalTracks = stations.reduce((sum, station) => sum + station._count.tracks, 0);
  const totalPlaylists = stations.reduce((sum, station) => sum + station._count.playlists, 0);
  const activeStations = stations.filter((s) => s.status === StationStatus.ACTIVE).length;

  return (
    <main className="container" style={{ width: "100%", margin: 0, padding: "1.5rem 0 2rem", display: "grid", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem" }}>Studio</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>
            Manage your stations, tracks, and playlists.
          </p>
        </div>
        <Link href="/dashboard/stations/new" className="btn primary">
          New station
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <div className="card stat-card" style={{ padding: "1.25rem" }}>
          <span className="stat-label">Stations</span>
          <span className="stat-value">{stations.length}</span>
        </div>
        <div className="card stat-card" style={{ padding: "1.25rem" }}>
          <span className="stat-label">Active</span>
          <span className="stat-value" style={{ color: "var(--success)" }}>{activeStations}</span>
        </div>
        <div className="card stat-card" style={{ padding: "1.25rem" }}>
          <span className="stat-label">Tracks</span>
          <span className="stat-value">{totalTracks}</span>
        </div>
        <div className="card stat-card" style={{ padding: "1.25rem" }}>
          <span className="stat-label">Playlists</span>
          <span className="stat-value">{totalPlaylists}</span>
        </div>
      </div>

      {/* Stations Grid */}
      {stations.length > 0 ? (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {stations.map((station) => (
            <article className="card" key={station.id} style={{ padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`badge ${station.status === "ACTIVE" ? "success" : station.status === "PAUSED" ? "warning" : ""}`}>
                  {station.status}
                </span>
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  {station._count.tracks} tracks
                </span>
              </div>

              <div>
                <h2 style={{ margin: "0 0 0.2rem", fontSize: "1.1rem" }}>{station.name}</h2>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {station.description ?? "No description"}
                </p>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                <code style={{ fontSize: "0.75rem" }}>{getPublicStreamUrl(station.mountPath)}</code>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href={`/dashboard/stations/${station.id}`} className="btn primary" style={{ flex: 1 }}>
                  Manage
                </Link>
                <Link href={`/stations/${station.slug}`} className="btn secondary">
                  Public page
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No stations yet</h2>
          <p className="muted" style={{ margin: "0 0 1.25rem" }}>
            Create your first station to generate encoder credentials and start broadcasting.
          </p>
          <Link href="/dashboard/stations/new" className="btn primary">
            Create station
          </Link>
        </div>
      )}
    </main>
  );
}
