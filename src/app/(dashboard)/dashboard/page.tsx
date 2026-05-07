import Link from "next/link";
import { StationStatus } from "@prisma/client";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";

export const metadata = {
  title: "Dashboard"
};

export default async function DashboardPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: {
          tracks: true,
          playlists: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const totalTracks = stations.reduce((sum, station) => sum + station._count.tracks, 0);
  const totalPlaylists = stations.reduce((sum, station) => sum + station._count.playlists, 0);
  const hasPublishedStation = stations.some((station) => station.status === StationStatus.ACTIVE);

  const checklist = [
    {
      label: "Create station",
      done: stations.length > 0,
      hint: stations.length > 0 ? `${stations.length} created` : "Create your first station"
    },
    {
      label: "Connect encoder",
      done: hasPublishedStation,
      hint: hasPublishedStation ? "At least one station is active" : "Activate a station after encoder setup"
    },
    {
      label: "Add tracks",
      done: totalTracks > 0,
      hint: totalTracks > 0 ? `${totalTracks} tracks in library` : "Add at least one track"
    },
    {
      label: "Create playlists",
      done: totalPlaylists > 0,
      hint: totalPlaylists > 0 ? `${totalPlaylists} playlists available` : "Create your first playlist"
    },
    {
      label: "Publish and share",
      done: hasPublishedStation,
      hint: hasPublishedStation ? "Public station page is ready to share" : "Switch status to ACTIVE"
    }
  ];

  const completedSteps = checklist.filter((item) => item.done).length;

  return (
    <main className="container" style={{ width: "100%", margin: 0, padding: "0.5rem 0 2rem", display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <span className="badge">Your stations</span>
          <h1 style={{ margin: "0.6rem 0 0.2rem" }}>Studio dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>
            Manage live source credentials, AutoDJ tracks, playlists, and public station pages.
          </p>
        </div>
        <Link href="/dashboard/stations/new" className="btn primary">
          Create station
        </Link>
      </div>

      <section className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ marginBottom: "0.25rem", fontSize: "1.1rem" }}>First broadcast checklist</h2>
            <p className="muted" style={{ margin: 0 }}>
              {completedSteps}/{checklist.length} steps complete.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            <Link href="/streaming" className="btn secondary">
              Streaming guide
            </Link>
            <Link href="/automation" className="btn secondary">
              Automation guide
            </Link>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: "0.8rem", gap: "0.65rem" }}>
          {checklist.map((item) => (
            <article key={item.label} className="card" style={{ padding: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>{item.done ? "[x]" : "[ ]"} {item.label}</p>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>
                {item.hint}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))" }}>
        {stations.map((station) => (
          <article className="card" key={station.id} style={{ padding: "1rem" }}>
            <span className="badge">{station.status}</span>
            <h2 style={{ margin: "0.55rem 0 0.2rem", fontSize: "1.15rem" }}>{station.name}</h2>
            <p className="muted" style={{ marginTop: 0 }}>{station.description ?? "No description yet"}</p>
            <p style={{ margin: "0.3rem 0", fontSize: "0.88rem" }}>
              Tracks: <strong>{station._count.tracks}</strong> | Playlists: <strong>{station._count.playlists}</strong>
            </p>
            <p style={{ margin: "0.3rem 0", fontSize: "0.85rem", color: "#334155" }}>
              Stream URL: <code>{getPublicStreamUrl(station.mountPath)}</code>
            </p>
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
              <Link href={`/dashboard/stations/${station.id}`} className="btn secondary">
                Manage
              </Link>
              <Link href={`/stations/${station.slug}`} className="btn secondary">
                Public page
              </Link>
            </div>
          </article>
        ))}
      </section>

      {stations.length === 0 ? (
        <div className="card" style={{ marginTop: "1rem", padding: "1rem" }}>
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.3rem" }}>No stations yet</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Create your first station to generate encoder credentials and AutoDJ playlists.
          </p>
          <Link href="/dashboard/stations/new" className="btn primary">
            Start now
          </Link>
        </div>
      ) : null}
    </main>
  );
}
