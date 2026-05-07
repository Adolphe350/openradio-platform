import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({ where: { slug } });

  if (!station) {
    return {
      title: "Station"
    };
  }

  return {
    title: station.name,
    description: station.description ?? station.streamDescription ?? "Listen live on OpenRadio Cloud"
  };
}

export default async function PublicStationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({
    where: { slug },
    include: {
      metrics: {
        orderBy: { sampledAt: "desc" },
        take: 1
      },
      tracks: {
        orderBy: { createdAt: "desc" },
        take: 8
      }
    }
  });

  if (!station) {
    notFound();
  }

  const metric = station.metrics[0];
  const streamUrl = getPublicStreamUrl(station.mountPath);

  return (
    <main style={{ minHeight: "100vh", padding: "2rem 0" }}>
      <div className="container" style={{ maxWidth: "860px" }}>
        <header className="card" style={{ padding: "1.2rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <span className="badge">Live station</span>
              <h1 style={{ margin: "0.6rem 0 0.25rem" }}>{station.name}</h1>
              <p className="muted" style={{ marginTop: 0 }}>{station.description ?? "Independent internet radio stream"}</p>
              <p style={{ margin: 0, fontSize: "0.9rem" }}>
                Genre: <strong>{station.genre ?? "Mixed"}</strong> · Language: <strong>{station.language}</strong>
              </p>
            </div>
            <Link href="/" className="btn secondary">
              OpenRadio Cloud
            </Link>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <audio controls preload="none" style={{ width: "100%" }} src={streamUrl} />
            <p className="muted" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              Stream URL: <code>{streamUrl}</code>
            </p>
          </div>
        </header>

        <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginBottom: "1rem" }}>
          <article className="card" style={{ padding: "0.9rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Current listeners</p>
            <strong style={{ fontSize: "1.3rem" }}>{metric?.currentListeners ?? "--"}</strong>
          </article>
          <article className="card" style={{ padding: "0.9rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Peak listeners</p>
            <strong style={{ fontSize: "1.3rem" }}>{metric?.peakListeners ?? "--"}</strong>
          </article>
          <article className="card" style={{ padding: "0.9rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Uptime</p>
            <strong style={{ fontSize: "1.3rem" }}>{metric ? `${metric.uptimePercent.toFixed(1)}%` : "--"}</strong>
          </article>
        </section>

        <section className="card" style={{ padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.4rem" }}>Recent library additions</h2>
          <div style={{ display: "grid", gap: "0.45rem" }}>
            {station.tracks.map((track) => (
              <article key={track.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0.6rem" }}>
                <strong>{track.title}</strong>
                <p className="muted" style={{ margin: 0 }}>{track.artist}</p>
              </article>
            ))}
            {station.tracks.length === 0 ? <p className="muted">No published tracks yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
