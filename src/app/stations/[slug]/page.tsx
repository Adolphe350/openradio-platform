import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StationPlayer } from "@/components/station-player";
import { PlayerBar } from "@/components/player-bar";
import { Icon } from "@/components/icons";
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

function formatPlayTime(date: Date, timeZone: string | null) {
  try {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timeZone || "UTC" });
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

function StationArt({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return (
    <span className="station-art" aria-hidden="true">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

export default async function PublicStationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({
    where: { slug },
  });

  if (!station) notFound();

  const streamUrl = getPublicStreamUrl(station.mountPath);
  const isActive = station.status === "ACTIVE";

  const related = await getRelatedStations({
    stationId: station.id,
    genre: station.genre,
    language: station.language,
    country: station.country,
    limit: 4,
  });

  const recent = await db.playLog.findMany({
    where: { stationId: station.id },
    orderBy: { playedAt: "desc" },
    take: 6,
    select: { id: true, title: true, artist: true, playedAt: true },
  });

  return (
    <>
      <SiteHeader />
      <main id="main" style={{ minHeight: "100vh" }}>
        <section className="pub-station-hero">
          <div className="pub-wrap pub-station-id">
            <StationArt name={station.name} logoUrl={station.logoUrl} />
            <div style={{ minWidth: 0 }}>
              <span className={`onair-pill ${isActive ? "onair-on" : "onair-paused"} onair-compact`}>
                <span className="onair-lamp" aria-hidden="true" />
                <span className="onair-text">{isActive ? "ON AIR" : "PAUSED"}</span>
              </span>
              <h1>{station.name}</h1>
              <div className="pub-station-tags">
                {station.genre ? <span>{station.genre}</span> : null}
                {station.country ? <span>{station.country}</span> : null}
                <span>{station.language}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="pub-wrap pub-station-body">
          <div style={{ display: "grid", gap: "1.25rem", alignContent: "start" }}>
            <section className="panel" aria-labelledby="player-title">
              <div className="panel-head">
                <h2 id="player-title">Listen live</h2>
                <span className="panel-meta mono">{station.mountPath}</span>
              </div>
              <StationPlayer
                stationId={station.id}
                stationName={station.name}
                stationSlug={station.slug}
                streamUrl={streamUrl}
                genre={station.genre}
                logoUrl={station.logoUrl}
              />
            </section>

            {station.description ? (
              <section className="panel" aria-labelledby="about-title">
                <h2 id="about-title" style={{ fontSize: "1rem" }}>About the station</h2>
                <p style={{ color: "var(--text-muted)", maxWidth: "68ch" }}>{station.description}</p>
              </section>
            ) : null}

            {recent.length > 0 ? (
              <section className="panel" aria-labelledby="recent-title">
                <div className="panel-head">
                  <h2 id="recent-title">Recently played</h2>
                </div>
                <ol className="playlog">
                  {recent.map((p) => (
                    <li key={p.id}>
                      <span className="playlog-time mono">
                        {formatPlayTime(p.playedAt, station.timezone)}
                      </span>
                      <span className="playlog-track">
                        <strong>{p.title}</strong>
                        {p.artist ? <span>{p.artist}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>

          <aside style={{ display: "grid", gap: "1.25rem", alignContent: "start" }}>
            {related.length > 0 ? (
              <section className="panel" aria-labelledby="related-title">
                <div className="panel-head">
                  <h2 id="related-title">More stations</h2>
                  <Link href="/explore" className="text-link">View all</Link>
                </div>
                <ul style={{ listStyle: "none", display: "grid", gap: "0.4rem" }}>
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link href={`/stations/${r.slug}`} className="dial-card" style={{ padding: "0.55rem 0.65rem" }}>
                        <StationArt name={r.name} logoUrl={r.logoUrl} />
                        <span className="dial-text">
                          <strong style={{ fontSize: "0.88rem" }}>{r.name}</strong>
                          <span>{r.genre ?? "Radio"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="panel" aria-labelledby="own-title">
              <h2 id="own-title" style={{ fontSize: "1rem" }}>Run your own station</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Upload music, schedule shows and go live with OpenRadio Cloud.</p>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <Link href="/sign-up" className="btn btn-primary btn-full">Get started</Link>
                <Link href="/explore" className="btn btn-secondary btn-full">
                  <Icon name="arrow-left" size={16} /> Explore stations
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </main>

      <SiteFooter />

      <PlayerBar
        stationName={station.name}
        stationSlug={station.slug}
        genre={station.genre}
        logoUrl={station.logoUrl}
      />
    </>
  );
}
