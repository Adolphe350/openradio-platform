import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PlayerBar } from "@/components/player-bar";
import { NowPlaying } from "@/components/now-playing";
import { StationPlayer } from "@/components/station-player";
import { buildPublicPopularity, metricSourceLabel, resolveStationMetric } from "@/lib/analytics";
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
    openGraph: {
      title: station.name,
      description: station.description ?? `Listen live`,
      images: station.logoUrl ? [{ url: station.logoUrl }] : undefined,
    },
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
      tracks: { orderBy: { createdAt: "desc" }, take: 10 },
      playlists: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, isDefault: true }, take: 10 },
      playLogs: { orderBy: { playedAt: "desc" }, select: { id: true, title: true, artist: true, playedAt: true }, take: 8 },
      schedules: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
        select: {
          id: true,
          name: true,
          dayOfWeek: true,
          startHour: true,
          startMin: true,
          endHour: true,
          endMin: true,
          playlist: { select: { id: true, name: true } },
        },
      },
      announcements: { where: { active: true }, orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { tracks: true, playlists: true } },
    },
  });

  if (!station) notFound();

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
          sampledAt: station.metrics[0].sampledAt,
        }
      : null,
  });
  const publicPopularity = buildPublicPopularity({
    stationId: station.id,
    trackCount: station._count.tracks,
    playlistCount: station._count.playlists,
    createdAt: station.createdAt,
    metric: metricState.source === "live" ? metricState.metric : null,
    status: station.status,
  });

  const activeScheduleBlock = resolveCurrentScheduleBlock(station.schedules, station.timezone);
  const fallbackPlaylist = station.playlists.find((playlist) => playlist.isDefault) ?? station.playlists[0] ?? null;
  const currentPlaylistName = activeScheduleBlock?.playlist?.name ?? fallbackPlaylist?.name ?? "AutoDJ rotation";
  const recentSpins = station.playLogs.slice(0, 5);

  const related = await getRelatedStations({
    stationId: station.id,
    genre: station.genre,
    language: station.language,
    country: station.country,
    limit: 6,
  });

  const grad = stationGradient(station.id);
  const rh1 = (station.id.charCodeAt(0) * 47 + station.id.charCodeAt(1) * 31) % 360;

  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <SiteHeader />

      {/* ── Banner ───────────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          height: 220,
          background: grad,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* subtle noise texture via CSS */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.18)" }} />
      </div>

      {/* ── Station identity row ─────────────────────────────────── */}
      <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <div className="container public-station-identity" style={{ position: "relative", paddingTop: "0.75rem", paddingBottom: "1.25rem" }}>
          {/* Square logo — overlaps banner */}
          <div
            className="public-station-logo"
            style={{
              width: 120,
              height: 120,
              borderRadius: 16,
              border: "4px solid var(--bg)",
              overflow: "hidden",
              background: grad,
              position: "absolute",
              top: -60,
              left: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "3rem",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {station.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={station.logoUrl} alt={station.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              "📻"
            )}
          </div>

          {/* Spacer for logo */}
          <div className="public-station-info" style={{ marginLeft: 136 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
              <div>
                {/* Live badge */}
                {station.status === "ACTIVE" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                    <span className="live-dot" />
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626" }}>
                      Live
                    </span>
                  </div>
                )}

                <h1 style={{ fontSize: "clamp(1.3rem,3.5vw,2rem)", margin: "0 0 0.35rem" }}>{station.name}</h1>

                {/* Tags */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                  {station.genre && (
                    <Link
                      href={`/explore?genre=${encodeURIComponent(station.genre)}`}
                      style={{
                        background: "var(--bg-page)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-full)", padding: "0.18rem 0.65rem",
                        fontSize: "0.78rem", fontWeight: 600, color: "var(--text)",
                      }}
                    >
                      {station.genre}
                    </Link>
                  )}
                  {station.country && (
                    <Link
                      href={`/explore?country=${encodeURIComponent(station.country)}`}
                      style={{
                        background: "var(--bg-page)", border: "1px solid var(--border)",
                        borderRadius: "var(--radius-full)", padding: "0.18rem 0.65rem",
                        fontSize: "0.78rem", color: "var(--text-muted)",
                      }}
                    >
                      {station.country}
                    </Link>
                  )}
                  <span
                    style={{
                      background: "var(--bg-page)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-full)", padding: "0.18rem 0.65rem",
                      fontSize: "0.78rem", color: "var(--text-muted)",
                    }}
                  >
                    {station.language}
                  </span>
                </div>
              </div>

              {/* Social links */}
              <div className="public-station-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {station.websiteUrl && (
                  <a href={station.websiteUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Website</a>
                )}
                {station.facebookUrl && (
                  <a href={station.facebookUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Facebook</a>
                )}
                {station.twitterUrl && (
                  <a href={station.twitterUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Twitter</a>
                )}
              </div>
            </div>

            {/* Description */}
            {station.description && (
              <p style={{ margin: "0.75rem 0 0", color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "66ch" }}>
                {station.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="container public-station-layout" style={{ padding: "1.75rem 0 4rem", display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.75rem", alignItems: "start" }}>

        {/* Left column */}
        <div style={{ display: "grid", gap: "1.25rem" }}>

          {/* Listen / Player */}
          <div
            className="card public-listen-card"
            style={{
              padding: "1.5rem",
              background: "var(--bg-dark)",
              border: "none",
              color: "#fff",
              display: "grid",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>Now Playing</p>
                <p style={{ margin: "0.2rem 0 0", color: "rgba(255,255,255,0.6)", fontSize: "0.85rem" }}>
                  {station.name}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="live-dot" />
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {station.status === "ACTIVE" ? "Live" : station.status}
                </span>
              </div>
            </div>

            {/* Live now-playing + listener count — polls every 15 s */}
            <NowPlaying mountPath={station.mountPath} />

            <StationPlayer
              stationId={station.id}
              stationName={station.name}
              stationSlug={station.slug}
              streamUrl={streamUrl}
              genre={station.genre}
              logoUrl={station.logoUrl}
              stationColor={grad}
              fallbackTracks={station.tracks
                .filter((t) => t.fileUrl || t.filePath)
                .map((t) => ({ title: t.title, artist: t.artist, url: `/api/audio/${t.id}` }))}
            />

            <div
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                padding: "0.75rem 0.85rem",
                display: "grid",
                gap: "0.45rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.62)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Current Playlist
                </span>
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#fff", textAlign: "right" }}>
                  {currentPlaylistName}
                </span>
              </div>
              {activeScheduleBlock && (
                <p style={{ margin: 0, fontSize: "0.77rem", color: "rgba(255,255,255,0.62)" }}>
                  Active slot: {activeScheduleBlock.name}
                </p>
              )}
              <p style={{ margin: 0, fontSize: "0.77rem", color: "rgba(255,255,255,0.62)" }}>
                Community pulse: {formatCompact(publicPopularity.listenersNow)} tuning in now · {formatCompact(publicPopularity.weeklyReach)} weekly reach
              </p>
            </div>

            {recentSpins.length > 0 && (
              <div style={{ display: "grid", gap: "0.35rem" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Recently Played
                </p>
                {recentSpins.map((spin) => (
                  <div key={spin.id} style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", minWidth: 56 }}>
                      {new Intl.DateTimeFormat("en", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(spin.playedAt)}
                    </span>
                    <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.88)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {spin.artist} — {spin.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="public-stream-url" style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>
              Stream URL: <code style={{ color: "rgba(255,255,255,0.55)" }}>{streamUrl}</code>
            </p>
          </div>

          {/* Recent tracks */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "1rem", margin: 0 }}>Recent Tracks</h2>
            </div>
            <div>
              {station.tracks.length > 0 ? station.tracks.map((track, i) => (
                <div
                  key={track.id}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.85rem",
                    padding: "0.75rem 1.25rem",
                    borderBottom: i < station.tracks.length - 1 ? "1px solid var(--border)" : "none",
                    background: i === 0 ? "rgba(0,200,160,0.04)" : undefined,
                  }}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                      background: `linear-gradient(135deg,hsl(${(i * 40 + rh1) % 360},55%,55%),hsl(${(i * 60 + rh1) % 360},65%,38%))`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    🎵
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {track.title}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{track.artist}</p>
                  </div>
                  {i === 0 && (
                    <span style={{ fontSize: "0.65rem", fontWeight: 700, background: "var(--brand-light)", color: "var(--brand-dark)", padding: "0.15rem 0.5rem", borderRadius: "999px", flexShrink: 0 }}>
                      Latest
                    </span>
                  )}
                </div>
              )) : (
                <p style={{ padding: "1.5rem 1.25rem", color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>
                  No tracks published yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "grid", gap: "1.25rem" }}>

          {/* Public social proof */}
          <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>Community Pulse</h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Tuning in now</span>
              <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>{formatCompact(publicPopularity.listenersNow)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Weekly reach</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>{formatCompact(publicPopularity.weeklyReach)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Trend</span>
              <span style={{ fontSize: "0.86rem", fontWeight: 700, textTransform: "capitalize" }}>{publicPopularity.trend}</span>
            </div>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--text-light)" }}>
              {publicPopularity.confidence === "measured" ? "Based on recent live snapshots." : "Estimated from station activity and current momentum."}
            </p>
          </div>

          {/* Metrics */}
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

          {/* Announcements */}
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

          {/* Related stations */}
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

          {/* Back / CTA */}
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Link href="/explore" className="btn btn-secondary btn-full">← Back to Explore</Link>
            <Link href="/sign-up" className="btn btn-primary btn-full">Create Your Own Station</Link>
          </div>
        </div>
      </div>

      {/* bottom padding so footer isn't hidden behind the player bar */}
      <div style={{ height: 80 }} />
      <SiteFooter />

      {/* Persistent bottom player bar */}
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
