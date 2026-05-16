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
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getStationTimeParts(timezone: string, at = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(at);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: dayMap[weekday] ?? 0,
    minuteOfDay: hour * 60 + minute,
  };
}

function resolveCurrentScheduleBlock(
  blocks: Array<{
    id: string;
    name: string;
    dayOfWeek: number;
    startHour: number;
    startMin: number;
    endHour: number;
    endMin: number;
    playlist: { id: string; name: string } | null;
  }>,
  timezone: string,
) {
  try {
    const stationNow = getStationTimeParts(timezone);
    return (
      blocks.find((block) => {
        const matchesDay = block.dayOfWeek === -1 || block.dayOfWeek === stationNow.dayOfWeek;
        if (!matchesDay) return false;

        const startMinute = block.startHour * 60 + block.startMin;
        const endMinute = block.endHour * 60 + block.endMin;
        return stationNow.minuteOfDay >= startMinute && stationNow.minuteOfDay < endMinute;
      }) ?? null
    );
  } catch {
    const fallbackNow = getStationTimeParts("UTC");
    return (
      blocks.find((block) => {
        const matchesDay = block.dayOfWeek === -1 || block.dayOfWeek === fallbackNow.dayOfWeek;
        if (!matchesDay) return false;

        const startMinute = block.startHour * 60 + block.startMin;
        const endMinute = block.endHour * 60 + block.endMin;
        return fallbackNow.minuteOfDay >= startMinute && fallbackNow.minuteOfDay < endMinute;
      }) ?? null
    );
  }
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

  const activeScheduleBlock = resolveCurrentScheduleBlock(station.schedules, station.timezone);
  const fallbackPlaylist = station.playlists.find((playlist) => playlist.isDefault) ?? station.playlists[0] ?? null;
  const currentPlaylistName = activeScheduleBlock?.playlist?.name ?? fallbackPlaylist?.name ?? "AutoDJ rotation";
  const recentSpins = station.playLogs.slice(0, 5);
  const fallbackLibraryTracks = station.tracks.slice(0, 5);
  const related = await getRelatedStations({
    stationId: station.id,
    genre: station.genre,
    language: station.language,
    country: station.country,
    limit: 4,
  });

  const grad = stationGradient(station.id);
  const rh1 = (station.id.charCodeAt(0) * 47 + station.id.charCodeAt(1) * 31) % 360;

  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
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

        <div style={{ display: "grid", gap: "1.25rem" }}>
          <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "0.85rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>Live Metrics</h3>
            {[
              { label: "Current listeners", value: metricState.source === "live" ? metricState.metric.currentListeners : "—" },
              { label: "Peak listeners", value: metricState.source === "live" ? metricState.metric.peakListeners : "—" },
              { label: "Uptime", value: metricState.source === "live" ? `${metricState.metric.uptimePercent.toFixed(1)}%` : "—" },
              { label: "Total hours", value: metricState.source === "live" ? `${metricState.metric.totalListeningHours.toFixed(1)}h` : "—" },
            ].map((stat) => (
              <div key={stat.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>{stat.label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>{stat.value}</span>
              </div>
            ))}
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: "var(--text-light)" }}>
              Data source: {metricSourceLabel(metricState.source)}
            </p>
          </div>

          {station.announcements.length > 0 && (
            <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
              <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>Announcements</h3>
              {station.announcements.map((a) => (
                <div key={a.id} style={{ padding: "0.75rem", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border)", borderLeft: "3px solid var(--brand)" }}>
                  <p style={{ margin: "0 0 0.3rem", fontWeight: 600, fontSize: "0.875rem" }}>{a.title}</p>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>{a.content}</p>
                </div>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>Related Stations</h3>
                <Link href="/explore" style={{ fontSize: "0.78rem", color: "var(--brand)", fontWeight: 600 }}>See all</Link>
              </div>
              {related.map((r, i) => {
                const rGrad = stationGradient(r.id);
                return (
                  <Link
                    key={r.id}
                    href={`/stations/${r.slug}`}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderBottom: i < related.length - 1 ? "1px solid var(--border)" : "none",
                      transition: "background 150ms",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                    className="station-row-link"
                  >
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: r.logoUrl ? undefined : rGrad,
                        overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.3rem",
                      }}
                    >
                      {r.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logoUrl} alt={r.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : "📻"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.775rem", color: "var(--text-muted)" }}>
                        {r.genre ?? "Radio"} · {formatCompact(r.publicListenersNow)} tuning in now
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Link href="/explore" className="btn btn-secondary btn-full">← Back to Explore</Link>
            <Link href="/sign-up" className="btn btn-primary btn-full">Create Your Own Station</Link>
          </div>
        </div>
      </div>

      <div style={{ height: 80 }} />
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
