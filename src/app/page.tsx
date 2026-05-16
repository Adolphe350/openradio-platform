import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const features = [
  {
    title: "Live Broadcasting",
    description: "Connect any Icecast-compatible encoder. Generated credentials, one-click activation.",
  },
  {
    title: "AutoDJ Playlists",
    description: "Organize tracks into rotations. Liquidsoap keeps your stream alive 24/7.",
  },
  {
    title: "Station Discovery",
    description: "Listeners find you through genre, language, and country filters on Explore.",
  },
  {
    title: "Public Pages",
    description: "Each station gets an SEO-friendly profile with one-click web playback.",
  },
  {
    title: "Self-Hosted",
    description: "Deploy on your servers with Docker Compose. No vendor lock-in, ever.",
  },
  {
    title: "Real-Time Stats",
    description: "Live listener counts pulled directly from Icecast. Know your audience.",
  },
];

const steps = [
  { number: "01", title: "Create Account", description: "Sign up and land in your studio dashboard." },
  { number: "02", title: "Connect Encoder", description: "Copy credentials into BUTT, Mixxx, or OBS." },
  { number: "03", title: "Build Playlists", description: "Add tracks for AutoDJ to fill gaps between shows." },
  { number: "04", title: "Go Live", description: "Activate your station and share your public page." },
];

export default function LandingPage() {
  return (
    <main>
      <SiteHeader />

      <section style={{ padding: "6rem 0 4rem" }}>
        <div className="container" style={{ textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
          <div className="badge" style={{ marginBottom: "1.25rem" }}>Open-source radio platform</div>
          <h1 style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.5rem)", lineHeight: 1.1, margin: "0 0 1.25rem", letterSpacing: "-0.03em" }}>
            Your radio station,<br />your infrastructure
          </h1>
          <p className="muted" style={{ fontSize: "1.1rem", margin: "0 auto 2rem", maxWidth: "560px", lineHeight: 1.7 }}>
            OpenRadio Cloud is a self-hosted platform for live broadcasting, automated playlists, and listener discovery.
            Full control over your streams and data.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="btn primary" href="/sign-up" style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}>
              Start broadcasting
            </Link>
            <Link className="btn secondary" href="/explore" style={{ padding: "0.75rem 1.5rem", fontSize: "0.95rem" }}>
              Explore stations
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 0 4rem" }}>
        <div className="container" style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div className="card" style={{ padding: "1.5rem", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--success)" }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--success)" }}>LIVE</span>
              </div>
              <span className="badge">Encoder Preview</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ padding: "0.75rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Host</p>
                <code style={{ fontSize: "0.8rem" }}>icecast:8000</code>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Mount</p>
                <code style={{ fontSize: "0.8rem" }}>/station.mp3</code>
              </div>
              <div style={{ padding: "0.75rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Bitrate</p>
                <code style={{ fontSize: "0.8rem" }}>192 kbps</code>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              <div className="stat-card card" style={{ border: "1px solid var(--border-light)" }}>
                <span className="stat-label">Listeners</span>
                <span className="stat-value">42</span>
              </div>
              <div className="stat-card card" style={{ border: "1px solid var(--border-light)" }}>
                <span className="stat-label">Peak</span>
                <span className="stat-value">128</span>
              </div>
              <div className="stat-card card" style={{ border: "1px solid var(--border-light)" }}>
                <span className="stat-label">Uptime</span>
                <span className="stat-value">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: "0 0 0.75rem" }}>Everything you need to broadcast</h2>
            <p className="muted" style={{ margin: "0 auto", maxWidth: "500px" }}>
              From encoder setup to listener analytics, all in one self-hosted stack.
            </p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
            {features.map((feature) => (
              <article className="card" key={feature.title} style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>{feature.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "4rem 0", background: "var(--bg-subtle)", borderRadius: 0 }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="badge" style={{ marginBottom: "0.75rem" }}>How it works</div>
            <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", margin: 0 }}>Live in four steps</h2>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
            {steps.map((step) => (
              <article key={step.number} style={{ display: "grid", gap: "0.5rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--brand)", opacity: 0.6 }}>{step.number}</span>
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>{step.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: "0.875rem" }}>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "5rem 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", margin: "0 0 0.75rem" }}>Ready to broadcast?</h2>
          <p className="muted" style={{ margin: "0 auto 1.5rem", maxWidth: "400px" }}>
            Create your station in under two minutes. Free, open-source, self-hosted.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/sign-up" className="btn primary" style={{ padding: "0.75rem 1.5rem" }}>
              Create account
            </Link>
            <Link href="/dashboard" className="btn secondary" style={{ padding: "0.75rem 1.5rem" }}>
              Open dashboard
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
