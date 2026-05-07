import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Streaming",
  description: "Set up encoder broadcasting in OpenRadio Cloud with station-level stream credentials."
};

const setupSteps = [
  {
    title: "Create a station",
    details: "Generate station slug, mount path, and source credentials from your dashboard."
  },
  {
    title: "Connect your encoder",
    details: "Use Icecast2 mode in RadioBOSS, BUTT, Mixxx, OBS, or Liquidsoap with the provided host and port."
  },
  {
    title: "Run a go-live check",
    details: "Use station diagnostics and public stream URL preview to confirm your mount and metadata are correct."
  },
  {
    title: "Publish your station",
    details: "Mark your station active and share the public page with listeners."
  }
];

const capabilities = [
  "Per-station source username and password",
  "Mount path generation and normalization",
  "Public stream URL generation for player pages",
  "Dashboard access to connection details",
  "Station status controls (draft, active, paused)",
  "Diagnostics panel with honest MVP status indicators"
];

const limits = [
  "Automated ingest probes are planned; current checks are informational.",
  "Per-station Liquidsoap worker orchestration is roadmap scope.",
  "Relay failover and regional distribution are not in this MVP yet."
];

export default function StreamingPage() {
  return (
    <main>
      <SiteHeader />

      <section style={{ padding: "2.7rem 0 1.7rem" }}>
        <div className="container" style={{ display: "grid", gap: "0.9rem" }}>
          <span className="badge">Creator workflow</span>
          <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 4.7vw, 2.8rem)" }}>Streaming setup built for open infrastructure</h1>
          <p className="muted" style={{ margin: 0, maxWidth: "72ch" }}>
            OpenRadio Cloud provides the core workflow to launch a station with encoder credentials, a public player page,
            and practical first-broadcast controls while keeping your deployment self-hosted.
          </p>
          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            <Link href="/sign-up" className="btn primary">
              Create account
            </Link>
            <Link href="/dashboard/stations/new" className="btn secondary">
              Create station
            </Link>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {setupSteps.map((step, index) => (
            <article key={step.title} className="card" style={{ padding: "1rem" }}>
              <span className="badge">Step {index + 1}</span>
              <h2 style={{ margin: "0.55rem 0 0.3rem", fontSize: "1.1rem" }}>{step.title}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {step.details}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container card" style={{ padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.4rem" }}>What is available in this MVP</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#334155" }}>
            {capabilities.map((item) => (
              <li key={item} style={{ marginBottom: "0.35rem" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container card" style={{ padding: "1rem", borderColor: "#fbcfe8", background: "#fff8fb" }}>
          <h2 style={{ marginBottom: "0.4rem" }}>Current limits to plan for</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#4b5563" }}>
            {limits.map((item) => (
              <li key={item} style={{ marginBottom: "0.35rem" }}>
                {item}
              </li>
            ))}
          </ul>
          <p className="muted" style={{ marginBottom: 0 }}>
            These roadmap boundaries are explicit so creators can make informed launch decisions.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
