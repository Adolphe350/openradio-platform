import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StationPlayer } from "@/components/station-player";
import { PlayerBar } from "@/components/player-bar";
import { db } from "@/lib/db";
import { getRelatedStations } from "@/lib/explore";
import { getPublicStreamUrl } from "@/lib/stream";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = await db.station.findUnique({ where: { slug } });
  if (!station) return { title: "Station not found" };
  return {
    title: station.name,
    description: station.description ?? `Listen to ${station.name} live on OpenRadio`,
  };
}

function stationGradient(id: string) {
  const h1 = (id.charCodeAt(0) * 47 + id.charCodeAt(1) * 31) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg,hsl(${h1},55%,42%),hsl(${h2},60%,28%))`;
}

export default async function PublicStationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({
    where: { slug },
  });

  if (!station) notFound();

  const streamUrl = getPublicStreamUrl(station.mountPath);
  const grad = stationGradient(station.id);

  const related = await getRelatedStations({
    stationId: station.id,
    genre: station.genre,
    language: station.language,
    country: station.country,
    limit: 4,
  });

  return (
    <main style={{ minHeight: "100vh" }}>
      <SiteHeader />

      {/* Station Hero Banner */}
      <div className="public-station-hero" style={{ width: "100%", height: 200, background: grad, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, var(--bg) 100%)" }} />
      </div>

      {/* Station Identity */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ position: "relative", paddingTop: "0.5rem", paddingBottom: "1.5rem" }}>
          <div className="public-station-identity" style={{ display: "flex", alignItems: "flex-end", gap: "1.25rem", flexWrap: "wrap" }}>
            {/* Logo */}
            <div className="public-station-logo" style={{ width: 110, height: 110, borderRadius: 14, border: "3px solid var(--bg)", overflow: "hidden", background: grad, marginTop: -55, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", color: "#fff", fontWeight: 800, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", flexShrink: 0 }}>
              {station.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={station.logoUrl} alt={station.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                station.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                {station.status === "ACTIVE" && (
                  <span className="badge badge-live" style={{ fontSize: "0.65rem" }}>
                    <span className="live-dot" style={{ width: 6, height: 6 }}></span>
                    LIVE
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: "clamp(1.4rem, 3.5vw, 2rem)", margin: "0 0 0.4rem" }}>{station.name}</h1>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {station.genre && <span style={{ padding: "0.15rem 0.5rem", background: "var(--bg-elevated)", borderRadius: 999, border: "1px solid var(--border)" }}>{station.genre}</span>}
                {station.country && <span style={{ padding: "0.15rem 0.5rem", background: "var(--bg-elevated)", borderRadius: 999, border: "1px solid var(--border)" }}>{station.country}</span>}
                <span style={{ padding: "0.15rem 0.5rem", background: "var(--bg-elevated)", borderRadius: 999, border: "1px solid var(--border)" }}>{station.language}</span>
              </div>
              {station.description && (
                <p style={{ margin: "0.6rem 0 0", color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: "60ch" }}>{station.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container public-station-layout" style={{ padding: "2rem 0 4rem", display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start" }}>
        {/* Left - Player */}
        <div className="public-station-main" style={{ display: "grid", gap: "1.25rem" }}>
          {/* Player Card */}
          <div className="card public-player-card" style={{ padding: "1.5rem", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Now Playing</p>
                <p style={{ margin: "0.15rem 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>{station.name}</p>
              </div>
              {station.status === "ACTIVE" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span className="live-dot" style={{ width: 8, height: 8 }}></span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--brand)", textTransform: "uppercase" }}>Live</span>
                </div>
              )}
            </div>


            <StationPlayer
              stationId={station.id}
              stationName={station.name}
              stationSlug={station.slug}
              streamUrl={streamUrl}
              genre={station.genre}
              logoUrl={station.logoUrl}
              stationColor={grad}

            />

          </div>

        </div>

        {/* Right Sidebar */}
        <div className="public-station-sidebar" style={{ display: "grid", gap: "1.25rem" }}>

          {/* Related Stations */}
          {related.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "0.9rem" }}>Related Stations</h3>
                <Link href="/explore" style={{ fontSize: "0.75rem", color: "var(--brand)", fontWeight: 600 }}>View all</Link>
              </div>
              {related.map((r, i) => (
                <Link key={r.id} href={`/stations/${r.slug}`} style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.65rem 1rem", borderBottom: i < related.length - 1 ? "1px solid var(--border)" : "none", textDecoration: "none", color: "inherit" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 9, background: r.logoUrl ? undefined : stationGradient(r.id), overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.85rem", flexShrink: 0 }}>
                    {r.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logoUrl} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : r.name.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{r.genre ?? "Radio"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Link href="/explore" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Back to Explore</Link>
            <Link href="/sign-up" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>Create Your Station</Link>
          </div>
        </div>
      </div>

      <SiteFooter />

      <PlayerBar
        stationName={station.name}
        stationSlug={station.slug}
        genre={station.genre}
        logoUrl={station.logoUrl}
        stationColor={grad}
      />
    </main>
  );
}
