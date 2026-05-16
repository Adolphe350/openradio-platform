import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StationPlayer } from "@/components/station-player";
import { NowPlaying } from "@/components/now-playing";
import { PlayerBar } from "@/components/player-bar";
import { metricSourceLabel, resolveStationMetric } from "@/lib/analytics";
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

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export default async function PublicStationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({
    where: { slug },
    include: {
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
      tracks: { orderBy: { createdAt: "desc" }, take: 10 },
      playlists: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, isDefault: true }, take: 10 },
      playLogs: { orderBy: { playedAt: "desc" }, select: { id: true, title: true, artist: true, playedAt: true }, take: 8 },
      schedules: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
        select: { id: true, name: true, dayOfWeek: true, startHour: true, startMin: true, endHour: true, endMin: true, playlist: { select: { id: true, name: true } } },
      },
      _count: { select: { tracks: true, playlists: true } },
    },
  });

  if (!station) notFound();

  const streamUrl = getPublicStreamUrl(station.mountPath);
  const grad = stationGradient(station.id);

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
          sampledAt: station.metrics[0].sampledAt,
        }
      : null,
  });

  const fallbackPlaylist = station.playlists.find((p) => p.isDefault) ?? station.playlists[0] ?? null;
  const currentPlaylistName = fallbackPlaylist?.name ?? "AutoDJ";
  const recentSpins = station.playLogs.slice(0, 5);

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
      <div style={{ width: "100%", height: 200, background: grad, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, var(--bg) 100%)" }} />
      </div>

      {/* Station Identity */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="container" style={{ position: "relative", paddingTop: "0.5rem", paddingBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1.25rem", flexWrap: "wrap" }}>
            {/* Logo */}
            <div style={{ width: 110, height: 110, borderRadius: 14, border: "3px solid var(--bg)", overflow: "hidden", background: grad, marginTop: -55, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", color: "#fff", fontWeight: 800, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", flexShrink: 0 }}>
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
      <div className="container" style={{ padding: "2rem 0 4rem", display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem", alignItems: "start" }}>
        {/* Left - Player */}
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Player Card */}
          <div className="card" style={{ padding: "1.5rem", background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
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

            <NowPlaying mountPath={station.mountPath} />

            <StationPlayer
              stationId={station.id}
              stationName={station.name}
              stationSlug={station.slug}
              streamUrl={streamUrl}
              genre={station.genre}
              logoUrl={station.logoUrl}
              stationColor={grad}

            />

            {/* Current Playlist Info */}
            <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Playlist</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{currentPlaylistName}</span>
              </div>
              <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Listeners now</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--brand)" }}>{formatCompact(metricState.metric.currentListeners)}</span>
              </div>
            </div>

            <p style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "var(--text-dim)" }}>
              Stream: <code style={{ background: "var(--bg-surface)", padding: "0.1rem 0.4rem", borderRadius: 4, fontSize: "0.7rem" }}>{streamUrl}</code>
            </p>
          </div>

          {/* Recently Played */}
          {recentSpins.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: "0.95rem", margin: 0 }}>Recently Played</h2>
              </div>
              {recentSpins.map((spin, i) => (
                <div key={spin.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 1.25rem", borderBottom: i < recentSpins.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `hsl(${(i * 50) % 360}, 50%, 35%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                    {spin.title.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{spin.title}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>{spin.artist}</p>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", flexShrink: 0 }}>{formatClockTime(spin.playedAt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Track Library */}
          {station.tracks.length > 0 && recentSpins.length === 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: "0.95rem", margin: 0 }}>Track Library</h2>
              </div>
              {station.tracks.slice(0, 6).map((track, i) => (
                <div key={track.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 1.25rem", borderBottom: i < Math.min(station.tracks.length, 6) - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `hsl(${(i * 60 + 120) % 360}, 45%, 35%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                    {track.title.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Stats */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ margin: "0 0 0.85rem", fontSize: "0.9rem" }}>Live Metrics</h3>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {[
                { label: "Listeners", value: formatCompact(metricState.metric.currentListeners) },
                { label: "Peak", value: formatCompact(metricState.metric.peakListeners) },
                { label: "Uptime", value: `${metricState.metric.uptimePercent.toFixed(1)}%` },
                { label: "Total hours", value: `${metricState.metric.totalListeningHours.toFixed(1)}h` },
              ].map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{s.label}</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{s.value}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: "0.6rem 0 0", fontSize: "0.7rem", color: "var(--text-dim)" }}>Source: {metricSourceLabel(metricState.source)}</p>
          </div>

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
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{r.genre ?? "Radio"} - {formatCompact(r.publicListenersNow)} listeners</p>
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
