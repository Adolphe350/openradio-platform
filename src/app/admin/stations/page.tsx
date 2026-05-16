import Link from "next/link";
import { StationStatus } from "@prisma/client";

import { requireSuperAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";

type Props = { searchParams: Promise<{ query?: string; status?: string }> };

export const metadata = { title: "Manage Stations – OpenRadio Admin" };

function validStatus(status?: string): StationStatus | undefined {
  return status && ["ACTIVE", "PAUSED", "DRAFT"].includes(status) ? (status as StationStatus) : undefined;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function AdminStationsPage({ searchParams }: Props) {
  await requireSuperAdmin();
  const { query = "", status = "" } = await searchParams;
  const statusFilter = validStatus(status);
  const trimmedQuery = query.trim();

  const stations = await db.station.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              { name: { contains: trimmedQuery, mode: "insensitive" } },
              { slug: { contains: trimmedQuery, mode: "insensitive" } },
              { mountPath: { contains: trimmedQuery, mode: "insensitive" } },
              { owner: { email: { contains: trimmedQuery, mode: "insensitive" } } },
              { owner: { name: { contains: trimmedQuery, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { tracks: true, playlists: true, announcements: true } },
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totalListeners = stations.reduce((sum, station) => sum + (station.metrics[0]?.currentListeners ?? 0), 0);

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">All Stations</h1>
          <p className="dash-page-sub">Search, inspect, and jump into every radio account on the platform.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Admin overview</Link>
      </div>

      <form className="card" style={{ padding: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: "0.25rem", flex: "1 1 260px" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>Search station, mount, or owner</span>
          <input name="query" defaultValue={query} placeholder="SoftVibes, /mount.mp3, email..." />
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>Status</span>
          <select name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
            <option value="DRAFT">DRAFT</option>
          </select>
        </label>
        <button className="btn btn-primary" type="submit">Filter</button>
      </form>

      <div className="mobile-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "1rem" }}>
        <div className="stat-card"><div className="stat-value">{stations.length}</div><div className="stat-label">Stations shown</div></div>
        <div className="stat-card"><div className="stat-value">{totalListeners}</div><div className="stat-label">Current listeners shown</div></div>
        <div className="stat-card"><div className="stat-value">{stations.filter((s) => s.status === "ACTIVE").length}</div><div className="stat-label">Active shown</div></div>
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", minWidth: 700 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "0.65rem" }}>Station</th>
              <th style={{ padding: "0.65rem" }}>Owner</th>
              <th style={{ padding: "0.65rem" }}>Status</th>
              <th style={{ padding: "0.65rem" }}>Listeners</th>
              <th style={{ padding: "0.65rem" }}>Peak</th>
              <th style={{ padding: "0.65rem" }}>Content</th>
              <th style={{ padding: "0.65rem" }}>Created</th>
              <th style={{ padding: "0.65rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => {
              const metric = station.metrics[0];
              return (
                <tr key={station.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.75rem 0.65rem", minWidth: 220 }}>
                    <div style={{ fontWeight: 800 }}>{station.name}</div>
                    <div style={{ color: "var(--text-light)", fontSize: "0.74rem" }}>{station.slug}</div>
                    <div style={{ color: "var(--text-light)", fontSize: "0.74rem", wordBreak: "break-all" }}>{getPublicStreamUrl(station.mountPath)}</div>
                  </td>
                  <td style={{ padding: "0.75rem 0.65rem", minWidth: 190 }}>
                    <div>{station.owner.name}</div>
                    <div style={{ color: "var(--text-light)", fontSize: "0.74rem", wordBreak: "break-all" }}>{station.owner.email}</div>
                  </td>
                  <td style={{ padding: "0.75rem 0.65rem" }}><span className={`badge ${station.status === "ACTIVE" ? "badge-green" : station.status === "PAUSED" ? "badge-blue" : ""}`}>{station.status}</span></td>
                  <td style={{ padding: "0.75rem 0.65rem", fontWeight: 900 }}>{metric?.currentListeners ?? 0}</td>
                  <td style={{ padding: "0.75rem 0.65rem" }}>{metric?.peakListeners ?? 0}</td>
                  <td style={{ padding: "0.75rem 0.65rem" }}>{station._count.tracks} tracks<br />{station._count.playlists} playlists</td>
                  <td style={{ padding: "0.75rem 0.65rem" }}>{formatDate(station.createdAt)}</td>
                  <td style={{ padding: "0.75rem 0.65rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <Link className="btn btn-secondary btn-sm" href={`/stations/${station.slug}`}>Public</Link>
                      <Link className="btn btn-primary btn-sm" href={`/dashboard/stations/${station.id}`}>Manage</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
