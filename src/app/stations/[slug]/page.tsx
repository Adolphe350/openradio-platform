import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { resolveStationMetric } from "@/lib/analytics";
import { db } from "@/lib/db";
import { getRelatedStations } from "@/lib/explore";
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
      },
      _count: {
        select: {
          tracks: true,
          playlists: true
        }
      }
    }
  });

  if (!station) {
    notFound();
  }

  const streamUrl = getPublicStreamUrl(station.mountPath);

  const metricState = resolveStationMetric({
    stationId: station.id,
    trackCount: station._count.tracks,
    playlistCount: station._count.playlists,
    createdAt: station.createdAt,
    metric: station.metrics[0]
      ? {
          currentListeners: station.metrics[0].currentListeners,
          peakListeners: station.metrics[0].peakListeners,
          totalListeningHours: station.metrics[0].totalListeningHours,
          uptimePercent: station.metrics[0].uptimePercent,
          storageUsedMb: station.metrics[0].storageUsedMb,
          sampledAt: station.metrics[0].sampledAt
        }
      : null
  });

  const relatedStations = await getRelatedStations({
    stationId: station.id,
    genre: station.genre,
    language: station.language,
    country: station.country,
    limit: 4
  });

  return (
    <main>
      <SiteHeader />

      <section style={{ minHeight: "100vh", padding: "2rem 0" }}>
        <div className="container" style={{ maxWidth: "900px" }}>
          <header className="card" style={{ padding: "1.2rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                <span className="badge">Live station</span>
                <h1 style={{ margin: "0.6rem 0 0.25rem" }}>{station.name}</h1>
                <p className="muted" style={{ marginTop: 0 }}>{station.description ?? "Independent internet radio stream"}</p>
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  Genre: <strong>{station.genre ?? "Mixed"}</strong> · Language: <strong>{station.language}</strong>
                  {station.country ? (
                    <>
                      {" "}· Country: <strong>{station.country}</strong>
                    </>
                  ) : null}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Link href="/explore" className="btn secondary">
                  Explore
                </Link>
                <Link href="/" className="btn secondary">
                  Home
                </Link>
              </div>
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
              <strong style={{ fontSize: "1.3rem" }}>{metricState.metric.currentListeners}</strong>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                {metricState.source === "live" ? "Live metric sample" : "Seeded sample metric"}
              </p>
            </article>
            <article className="card" style={{ padding: "0.9rem" }}>
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Peak listeners</p>
              <strong style={{ fontSize: "1.3rem" }}>{metricState.metric.peakListeners}</strong>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                {metricState.source === "live" ? "Live metric sample" : "Seeded sample metric"}
              </p>
            </article>
            <article className="card" style={{ padding: "0.9rem" }}>
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Uptime</p>
              <strong style={{ fontSize: "1.3rem" }}>{metricState.metric.uptimePercent.toFixed(1)}%</strong>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.75rem" }}>
                {metricState.source === "live" ? "Live metric sample" : "Seeded sample metric"}
              </p>
            </article>
          </section>

          <section className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
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

          <section className="card" style={{ padding: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>Related and recent stations</h2>
              <Link href="/explore" className="btn secondary">
                More stations
              </Link>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", marginTop: "0.8rem" }}>
              {relatedStations.map((related) => (
                <article key={related.id} className="card" style={{ padding: "0.8rem" }}>
                  <h3 style={{ margin: "0 0 0.2rem", fontSize: "1rem" }}>{related.name}</h3>
                  <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                    {related.genre ?? "Mixed"} · {related.language}
                  </p>
                  <p style={{ margin: "0.3rem 0", fontSize: "0.84rem" }}>
                    Listeners: <strong>{related.currentListeners}</strong>
                  </p>
                  <Link href={`/stations/${related.slug}`} className="btn secondary">
                    Open
                  </Link>
                </article>
              ))}
            </div>
            {relatedStations.length === 0 ? <p className="muted">More stations will appear here as creators publish.</p> : null}
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
