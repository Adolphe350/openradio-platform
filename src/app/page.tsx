import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { db } from "@/lib/db";

export default async function HomePage() {
  const liveStations = await db.station.findMany({
    where: {
      status: "ACTIVE",
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      genre: true,
      logoUrl: true,
    },
  });

  const genres = [
    "Pop",
    "Rock",
    "Electronic",
    "Hip Hop",
    "Jazz",
    "Classical",
    "Country",
    "Latin",
  ];

  return (
    <>
      <SiteHeader />

      <main>
        <section className="hero">
          <div className="container">
            <h1 className="hero-title">
              Listen to Global Radio
              <br />
              or Create Your Own
            </h1>
            <p className="hero-sub">
              The open-source platform for broadcasting and discovering radio
              stations. Stream live to unlimited listeners, analyze your
              audience, and grow your community.
            </p>
            <div className="hero-cta-group">
              <Link href="/create" className="btn btn-xl btn-primary">
                Create a Station →
              </Link>
              <Link href="/explore" className="btn btn-xl btn-ghost-dark">
                Listen Now
              </Link>
            </div>
          </div>
        </section>

        <section className="section-row">
          <div className="container">
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
              <h2 className="section-title" style={{ marginBottom: 0 }}>
                Popular Live Radio
              </h2>
              <span className="badge badge-live">
                <span className="live-dot"></span>
                LIVE NOW
              </span>
            </div>

            {liveStations.length > 0 ? (
              <div className="grid-cards">
                {liveStations.map((station) => (
                  <Link
                    key={station.id}
                    href={`/${station.slug}`}
                    className="station-card"
                  >
                    <div className="station-card-thumb">
                      {station.logoUrl ? (
                        <img src={station.logoUrl} alt={station.name} />
                      ) : (
                        <span>{station.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="station-card-body">
                      <h3 className="station-card-title">{station.name}</h3>
                      <div className="station-card-meta">
                        <span>{station.genre || "General"}</span>
                        <span>•</span>
                        <span className="text-brand">● LIVE</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📻</div>
                <h3>No live stations yet</h3>
                <p>Be the first to broadcast on OpenRadio</p>
              </div>
            )}
          </div>
        </section>

        <section className="section-row" style={{ background: "var(--bg-surface)" }}>
          <div className="container">
            <h2 className="section-title text-center">
              Everything You Need to Broadcast
            </h2>
            <p className="text-center muted" style={{ fontSize: "1.125rem", marginBottom: "48px", maxWidth: "600px", margin: "0 auto 48px" }}>
              Professional broadcasting tools for creators of all sizes. From
              solo podcasters to global radio networks.
            </p>

            <div className="grid-cards">
              <div className="feature-item">
                <div className="feature-icon">∞</div>
                <h3>Unlimited Listeners</h3>
                <p>
                  Scale to millions without worrying about bandwidth costs.
                  Auto-scaling infrastructure handles traffic spikes.
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">📊</div>
                <h3>Real-Time Analytics</h3>
                <p>
                  Track listeners, peak hours, geographic distribution, and
                  engagement metrics in beautiful dashboards.
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <h3>Auto-DJ System</h3>
                <p>
                  Upload your music library and let our AI DJ keep the music
                  playing 24/7 when you are offline.
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🎙️</div>
                <h3>Live Recording</h3>
                <p>
                  Archive every broadcast automatically. Download recordings or
                  publish them as podcast episodes.
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">🔗</div>
                <h3>Embed Anywhere</h3>
                <p>
                  Add a beautiful web player to your website with one line of
                  code. Works on all modern browsers.
                </p>
              </div>

              <div className="feature-item">
                <div className="feature-icon">⚡</div>
                <h3>Low Latency Streaming</h3>
                <p>
                  Sub-second latency for real-time interaction with your
                  audience. Perfect for live events and talk shows.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-row">
          <div className="container">
            <h2 className="section-title text-center">Discover by Genre</h2>
            <p className="text-center muted" style={{ marginBottom: "40px" }}>
              Explore thousands of stations across every genre
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
              {genres.map((genre) => (
                <Link
                  key={genre}
                  href={`/explore?genre=${genre.toLowerCase()}`}
                  className="trending-tag"
                >
                  {genre}
                </Link>
              ))}
              <Link href="/explore" className="trending-tag text-brand">
                View All Genres →
              </Link>
            </div>
          </div>
        </section>

        <section className="section-row" style={{ background: "linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)", padding: "80px 0" }}>
          <div className="container" style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
              Ready to Start Broadcasting?
            </h2>
            <p className="muted" style={{ fontSize: "1.125rem", marginBottom: "32px", maxWidth: "500px", margin: "0 auto 32px" }}>
              Join thousands of creators streaming to millions of listeners
              worldwide. Get started in minutes.
            </p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/sign-up" className="btn btn-xl btn-primary">
                Create Your Station
              </Link>
              <Link href="/pricing" className="btn btn-xl btn-secondary">
                View Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
