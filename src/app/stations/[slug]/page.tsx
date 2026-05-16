import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { resolveStationMetric, metricSourceLabel } from "@/lib/analytics";
import { db } from "@/lib/db";
import { getRelatedStations } from "@/lib/explore";
import { getPublicStreamUrl } from "@/lib/stream";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = await db.station.findUnique({ where: { slug } });

  if (!station) return { title: "Station" };

  return {
    title: station.name,
    description: station.description ?? "Listen live on OpenRadio Cloud",
  };
}

export default async function PublicStationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({
    where: { slug },
    include: {
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
      tracks: { orderBy: { createdAt: "desc" }, take: 8 },
      _count: { select: { tracks: true, playlists: true } },
    },
  });

  if (!station) notFound();

  const streamUrl = getPublicStreamUrl(station.mountPath);

  const metricState = await resolveStationMetric({
    stationId: station.id,
    mountPath: station.mountPath,
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
          sampledAt: station.metrics[0].sampledAt,
        }
      : null,
  });

  const relatedStations = await getRelatedStations({
    stationId: station.id,
    genre: station.genre,
    language: station.language,
    country: station.country,
    limit: 4,
  });

  return (
    <main>
      <SiteHeader />

      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ maxWidth: "800px", margin: "0 auto", display: "grid", gap: "1.5rem" }}>
          {/* Station Header */}
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: station.status === "ACTIVE" ? "var(--success)" : "var(--warning)" }} />
                  <span className="badge success">{station.status}</span>
                </div>
                <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.75rem" }}>{station.name}</h1>
                <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
                  {station.description ?? "Internet radio station"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link href="/explore" className="btn secondary">Explore</Link>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
              <span>Genre: <strong>{station.genre ?? "Mixed"}</strong></span>
              <span>Language: <strong>{station.language}</strong></span>
              {station.country ? <span>Country: <strong>{station.country}</strong></span> : null}
            </div>

            {/* Player */}
            <div style={{ padding: "1.25rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)" }}>
              <audio controls preload="none" style={{ width: "100%", marginBottom: "0.75rem" }} src={streamUrl} />
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                Stream: <code style={{ fontSize: "0.75rem" }}>{streamUrl}</code>
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="card stat-card" style={{ padding: "1.25rem", textAlign: "center" }}>
              <span className="stat-label">Listeners</span>
              <span className="stat-value">{metricState.metric.currentListeners}</span>
              <span className="badge" style={{ marginTop: "0.25rem", fontSize: "0.6rem" }}>{metricSourceLabel(metricState.source)}</span>
            </div>
            <div className="card stat-card" style={{ padding: "1.25rem", textAlign: "center" }}>
              <span className="stat-label">Peak</span>
              <span className="stat-value">{metricState.metric.peakListeners}</span>
            </div>
            <div className="card stat-card" style={{ padding: "1.25rem", textAlign: "center" }}>
              <span className="stat-label">Uptime</span>
              <span className="stat-value">{metricState.metric.uptimePercent.toFixed(1)}%</span>
            </div>
          </div>

          {/* Recent Tracks */}
          {station.tracks.length > 0 ? (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Recent tracks</h2>
              <div style={{ display: "grid", gap: "0.4rem" }}>
                {station.tracks.map((track) => (
                  <div key={track.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.75rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                    <div>
                      <strong style={{ fontSize: "0.875rem" }}>{track.title}</strong>
                      <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>{track.artist}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Related Stations */}
          {relatedStations.length > 0 ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem" }}>More stations</h2>
                <Link href="/explore" className="btn secondary" style={{ fontSize: "0.8rem" }}>View all</Link>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                {relatedStations.map((related) => (
                  <article key={related.id} className="card" style={{ padding: "1rem" }}>
                    <h3 style={{ margin: "0 0 0.25rem", fontSize: "0.95rem" }}>{related.name}</h3>
                    <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.8rem" }}>
                      {related.genre ?? "Mixed"} &middot; {related.language}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem" }}>{related.currentListeners} listeners</span>
                      <Link href={`/stations/${related.slug}`} className="btn secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>Listen</Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
