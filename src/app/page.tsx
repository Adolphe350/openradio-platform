import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const features = [
  {
    title: "Live Broadcasting",
    description:
      "Connect RadioBOSS, BUTT, Mixxx, OBS, or any Icecast-compatible encoder with generated source credentials."
  },
  {
    title: "AutoDJ Playlists",
    description:
      "Organize tracks into reusable rotations, then hand them to the Liquidsoap-backed baseline automation layer."
  },
  {
    title: "Listener Discovery",
    description: "Surface stations on Explore with searchable genres, languages, and countries for easy discovery."
  },
  {
    title: "Public Station Pages",
    description: "Give each station an SEO-friendly profile with one-click playback and shareable links."
  },
  {
    title: "Self-Hosted Infrastructure",
    description:
      "Deploy the full stack on your own servers using Docker Compose and Coolify with no vendor lock-in."
  },
  {
    title: "Scalable Foundation",
    description:
      "Start with Icecast + Liquidsoap, then extend toward relays, HLS packaging, and region-aware delivery."
  }
];

const steps = [
  {
    title: "Create Your Account",
    description: "Sign up, land in your dashboard, and spin up your first station in under two minutes."
  },
  {
    title: "Connect an Encoder",
    description: "Copy host, port, mount, and source password into your preferred broadcasting software."
  },
  {
    title: "Program AutoDJ",
    description: "Add tracks and playlists so your stream continues automatically between live shows."
  },
  {
    title: "Publish and Share",
    description: "Mark your station active, share your public page, and improve with analytics feedback."
  }
];

const creatorFunnels = [
  {
    href: "/streaming",
    title: "Streaming",
    description: "Understand encoder connection, stream credentials, and activation flow for first go-live."
  },
  {
    href: "/automation",
    title: "Automation",
    description: "Map your track library into playlists and see what AutoDJ controls are available now vs planned."
  },
  {
    href: "/pricing",
    title: "Pricing",
    description: "Review open-source self-hosting tiers and a practical path from personal to production operations."
  }
];

const tiers = [
  {
    name: "Community",
    price: "$0",
    highlight: "Self-host forever",
    points: [
      "Unlimited stations by your server capacity",
      "Live source credentials + AutoDJ playlists",
      "Public player pages",
      "MIT licensed source code"
    ]
  },
  {
    name: "Operator",
    price: "Infra cost only",
    highlight: "Production ready",
    points: [
      "Docker Compose + Coolify deployment",
      "Postgres-backed station and track data",
      "Icecast + Liquidsoap baseline stack",
      "Extend with your own integrations"
    ]
  },
  {
    name: "Scale",
    price: "Bring your architecture",
    highlight: "Roadmap tier",
    points: [
      "Relay regions and failover",
      "Advanced analytics pipeline",
      "Geo/IP policy and stream alerts",
      "Enterprise-ready multi-user permissions"
    ]
  }
];

export default function LandingPage() {
  return (
    <main>
      <SiteHeader />

      <section style={{ padding: "4.7rem 0 4rem" }}>
        <div className="container hero-grid">
          <div>
            <span className="badge">Open-source radio hosting</span>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.35rem)", lineHeight: 1.08, margin: "0.95rem 0" }}>
              Launch and grow internet radio stations on infrastructure you control.
            </h1>
            <p className="muted" style={{ fontSize: "1.08rem", marginBottom: "1.5rem", maxWidth: "62ch" }}>
              OpenRadio Cloud is a self-hosted platform for live broadcasting, AutoDJ scheduling, and listener discovery.
              Keep full ownership of your stream, your data, and your roadmap.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
              <Link className="btn primary" href="/sign-up">
                Create your station
              </Link>
              <Link className="btn secondary" href="/explore">
                Explore stations
              </Link>
              <Link className="btn secondary" href="/dashboard">
                Open dashboard
              </Link>
            </div>
          </div>

          <div className="card" style={{ padding: "1.2rem", background: "linear-gradient(145deg, #ffffff, #eff6ff)" }}>
            <div style={{ borderRadius: "14px", overflow: "hidden", border: "1px solid #dbeafe" }}>
              <div style={{ background: "#0f172a", color: "#f8fafc", padding: "0.65rem 0.95rem", fontSize: "0.86rem" }}>
                Encoder connection preview
              </div>
              <div style={{ padding: "1rem", display: "grid", gap: "0.65rem", fontFamily: "ui-monospace, Menlo, monospace" }}>
                <p style={{ margin: 0 }}>Host: `icecast`</p>
                <p style={{ margin: 0 }}>Port: `8000`</p>
                <p style={{ margin: 0 }}>Mount: `/city-sunset.mp3`</p>
                <p style={{ margin: 0 }}>Username: `source`</p>
                <p style={{ margin: 0 }}>Password: `generated-per-station`</p>
                <p style={{ margin: 0 }}>Public URL: `http://localhost:8000/city-sunset.mp3`</p>
              </div>
            </div>
            <div style={{ marginTop: "0.9rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem" }}>
              <div className="card" style={{ padding: "0.75rem" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>
                  Current listeners
                </p>
                <strong style={{ fontSize: "1.2rem" }}>38</strong>
              </div>
              <div className="card" style={{ padding: "0.75rem" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>
                  Peak listeners
                </p>
                <strong style={{ fontSize: "1.2rem" }}>124</strong>
              </div>
              <div className="card" style={{ padding: "0.75rem" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>
                  Uptime
                </p>
                <strong style={{ fontSize: "1.2rem" }}>99.2%</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "2rem 0" }}>
        <div className="container grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          {features.map((feature) => (
            <article className="card" key={feature.title} style={{ padding: "1rem" }}>
              <h2 style={{ marginBottom: "0.45rem", fontSize: "1.08rem" }}>{feature.title}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ padding: "2.4rem 0" }}>
        <div className="container" style={{ display: "grid", gap: "1rem" }}>
          <div className="section-heading">
            <span className="badge">Creator funnels</span>
            <h2 style={{ margin: 0 }}>Choose your path based on what you need right now</h2>
            <p className="muted" style={{ margin: 0 }}>
              Dedicated workflow pages explain streaming setup, automation capabilities, and operational pricing options.
            </p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            {creatorFunnels.map((funnel) => (
              <article key={funnel.href} className="card" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{funnel.title}</h2>
                <p className="muted" style={{ margin: 0 }}>
                  {funnel.description}
                </p>
                <div>
                  <Link className="btn secondary" href={funnel.href}>
                    Open {funnel.title}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ display: "grid", gap: "1.2rem" }}>
          <div className="section-heading">
            <span className="badge">How it works</span>
            <h2 style={{ fontSize: "clamp(1.6rem, 4.2vw, 2.3rem)", margin: 0 }}>Ship your station from zero to live in four steps</h2>
            <p className="muted">
              The MVP focuses on dependable fundamentals: identity, station management, stream credentials, AutoDJ metadata,
              and open deployment.
            </p>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {steps.map((step, index) => (
              <article className="card" key={step.title} style={{ padding: "1rem" }}>
                <span className="badge">Step {index + 1}</span>
                <h3 style={{ margin: "0.6rem 0 0.35rem" }}>{step.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0" }}>
        <div className="container grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          {tiers.map((tier) => (
            <article key={tier.name} className="card" style={{ padding: "1rem", position: "relative" }}>
              <span className="badge">{tier.highlight}</span>
              <h3 style={{ margin: "0.8rem 0 0.15rem" }}>{tier.name}</h3>
              <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 700 }}>{tier.price}</p>
              <ul style={{ margin: "0.8rem 0 0", paddingLeft: "1.1rem", color: "#334155" }}>
                {tier.points.map((point) => (
                  <li key={point} style={{ marginBottom: "0.35rem" }}>
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section style={{ padding: "2rem 0 1.5rem" }}>
        <div
          className="container card"
          style={{
            padding: "1.3rem",
            background: "linear-gradient(135deg, rgba(2, 132, 199, 0.13), rgba(30, 58, 138, 0.12)), #fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <div>
            <h2 style={{ marginBottom: "0.2rem" }}>Start broadcasting with OpenRadio Cloud</h2>
            <p className="muted" style={{ margin: 0 }}>
              Original open-source software inspired by common radio-hosting workflows.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Link href="/sign-up" className="btn primary">
              Create account
            </Link>
            <Link href="/explore" className="btn secondary">
              Browse stations
            </Link>
            <Link href="/dashboard" className="btn secondary">
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
