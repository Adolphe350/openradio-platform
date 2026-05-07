import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";

/* ── helpers ─────────────────────────────────────────────────────── */
function stationColor(id: string) {
  const h1 = (id.charCodeAt(0) * 47 + id.charCodeAt(1) * 31) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg,hsl(${h1},55%,48%),hsl(${h2},60%,35%))`;
}

const creatorFeatures = [
  { icon: "📡", title: "Unlimited Listeners", desc: "No listener caps. Stream to your entire audience with unlimited bandwidth and relay creation." },
  { icon: "📊", title: "Up to 6 Months Analytics", desc: "Track listener growth, peak times, geographic reach, and total listening hours over time." },
  { icon: "💰", title: "Audio Advertising", desc: "Monetize your station through audio ad insertion. Turn listeners into revenue automatically." },
  { icon: "🎙️", title: "Show Recording", desc: "Record your live shows and publish them as on-demand podcast episodes automatically." },
  { icon: "🤖", title: "Auto-DJ Automation", desc: "Keep your station live 24/7 with playlist automation. Never go silent between live shows." },
  { icon: "📞", title: "Call-to-Listen", desc: "Let listeners call in via a dedicated phone line and hear your stream directly (USA)." },
];

const trustedBy = ["NPR", "BBC", "Washington Post", "Estrella Media", "Radio France"];

export default async function HomePage() {
  const liveStations = await db.station
    .findMany({ where: { status: "ACTIVE" }, orderBy: { updatedAt: "desc" }, take: 8 })
    .catch(() => []);

  return (
    <main>
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="container" style={{ display: "grid", gap: "1.5rem", justifyItems: "center" }}>
          <h1 className="hero-title">Listen to Global Radio or Create Your Own</h1>
          <p className="hero-sub">
            OpenRadio is a free, open-source platform to launch and grow an internet radio station.
            Full broadcasting features, no vendor lock-in.
          </p>
          <div className="hero-cta-group">
            <Link href="/sign-up" className="btn btn-primary btn-xl">
              Create a Station — Free
            </Link>
            <Link href="/explore" className="btn btn-ghost-dark btn-xl">
              Listen Now
            </Link>
          </div>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>
            No credit card required · Self-hosted · MIT licensed
          </p>
        </div>
      </section>

      {/* ── Trusted by ───────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid var(--border)", background: "#fafafa", padding: "1.25rem 0" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", justifyContent: "center" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-light)" }}>
            Inspired by workflows used at
          </span>
          {trustedBy.map((b) => (
            <span key={b} style={{ fontSize: "0.9rem", fontWeight: 700, color: "#9ca3af" }}>{b}</span>
          ))}
        </div>
      </section>

      {/* ── Popular Live Radio ────────────────────────────────────── */}
      {liveStations.length > 0 && (
        <section style={{ padding: "2.5rem 0" }}>
          <div className="container">
            <div className="section-row">
              <h2 className="section-title">Popular Live Radio</h2>
              <Link href="/explore" style={{ fontSize: "0.875rem", color: "var(--brand)", fontWeight: 600 }}>
                Show All
              </Link>
            </div>
            <div className="grid-cards">
              {liveStations.map((station) => (
                <Link key={station.id} href={`/stations/${station.slug}`} className="station-card">
                  <div
                    className="station-card-thumb"
                    style={{
                      background: station.logoUrl ? undefined : stationColor(station.id),
                      position: "relative",
                    }}
                  >
                    {station.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={station.logoUrl} alt={station.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem" }}>📻</div>
                    )}
                  </div>
                  <div className="station-card-body">
                    <p className="station-card-title">{station.name}</p>
                    <p className="station-card-meta">{station.genre ?? "Radio"}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Creator Features ─────────────────────────────────────── */}
      <section style={{ padding: "3rem 0", background: "var(--bg-page)" }}>
        <div className="container" style={{ display: "grid", gap: "2.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: "0 0 0.6rem" }}>
              Creator Tools
            </p>
            <h2 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", margin: "0 auto 0.8rem", maxWidth: "22ch" }}>
              Everything you need to run a professional radio station
            </h2>
            <p style={{ color: "var(--text-muted)", maxWidth: "54ch", margin: "0 auto", fontSize: "0.95rem" }}>
              OpenRadio gives you all the tools that top broadcasters use — completely free and open source.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.25rem" }}>
            {creatorFeatures.map((f) => (
              <div key={f.title} className="feature-item card" style={{ padding: "1.25rem" }}>
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <p style={{ margin: "0 0 0.3rem", fontWeight: 700, fontSize: "0.95rem" }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: "0.855rem", color: "var(--text-muted)", lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Discovery ────────────────────────────────────────────── */}
      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "3rem", alignItems: "center" }}>
          <div style={{ display: "grid", gap: "1rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: 0 }}>
              Listener Discovery
            </p>
            <h2 style={{ fontSize: "clamp(1.5rem,3.5vw,2.2rem)", margin: 0 }}>
              Browse by country, language, genre and creator
            </h2>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.93rem", lineHeight: 1.65 }}>
              Discover radio stations from around the world. Filter by genre, language, or location to find your perfect station.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <Link href="/explore" className="btn btn-primary">Browse Stations</Link>
              <Link href="/sign-up" className="btn btn-secondary">Start Broadcasting</Link>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
            {["Pop","Hip-Hop","Jazz","News","Rock","Electronic","Classical","R&B"].map((g) => (
              <Link
                key={g}
                href={`/explore?genre=${encodeURIComponent(g)}`}
                className="card"
                style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.875rem", transition: "box-shadow 150ms" }}
              >
                🎵 {g}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────── */}
      <section style={{ padding: "3rem 0", background: "var(--bg-dark)" }}>
        <div className="container" style={{ textAlign: "center", display: "grid", gap: "1.2rem", justifyItems: "center" }}>
          <h2 style={{ fontSize: "clamp(1.5rem,4vw,2.4rem)", color: "#fff", margin: 0 }}>
            Join the OpenRadio Community Today
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", maxWidth: "48ch", margin: 0, fontSize: "0.95rem" }}>
            Thousands of creators broadcast with OpenRadio Cloud. Free, open-source, and yours to own.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/sign-up" className="btn btn-primary btn-lg">Create Free Station</Link>
            <Link href="/explore" className="btn btn-ghost-dark btn-lg">Explore Stations</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
