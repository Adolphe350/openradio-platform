import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Pricing",
  description: "Original OpenRadio Cloud pricing-style guidance for self-hosted operations."
};

const plans = [
  {
    name: "Community",
    price: "$0",
    scope: "Personal and hobby use",
    highlights: [
      "Self-hosted deployment",
      "Station creation + public pages",
      "Track and playlist CRUD",
      "Explore directory visibility for active stations"
    ]
  },
  {
    name: "Operator",
    price: "Infrastructure cost",
    scope: "Independent stations and small networks",
    highlights: [
      "Coolify or Docker Compose rollout",
      "Managed backups and alerting by your team",
      "Operational runbooks for encoder and stream incidents",
      "Configurable scaling based on your own infra budget"
    ]
  },
  {
    name: "Scale",
    price: "Custom architecture",
    scope: "Large networks and advanced ops",
    highlights: [
      "Planned worker orchestration and scheduling features",
      "Planned analytics expansion and ingestion pipelines",
      "Relay and failover strategies by region",
      "Role-based collaboration roadmap"
    ]
  }
];

const notes = [
  "OpenRadio Cloud does not run proprietary hosted billing in this MVP.",
  "You own infrastructure, secrets, and total recurring platform cost.",
  "Roadmap capabilities are marked clearly so there is no hidden feature assumption."
];

export default function PricingPage() {
  return (
    <main>
      <SiteHeader />

      <section style={{ padding: "2.7rem 0 1.6rem" }}>
        <div className="container" style={{ display: "grid", gap: "0.8rem" }}>
          <span className="badge">Creator workflow</span>
          <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 4.6vw, 2.8rem)" }}>Operational pricing without lock-in</h1>
          <p className="muted" style={{ margin: 0, maxWidth: "72ch" }}>
            OpenRadio Cloud is open-source software. Cost is tied to your infrastructure footprint and operations model,
            not hidden platform fees.
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          {plans.map((plan) => (
            <article key={plan.name} className="card" style={{ padding: "1rem", display: "grid", gap: "0.6rem" }}>
              <div>
                <h2 style={{ marginBottom: "0.2rem", fontSize: "1.2rem" }}>{plan.name}</h2>
                <p style={{ margin: 0, fontSize: "1.55rem", fontWeight: 700 }}>{plan.price}</p>
                <p className="muted" style={{ margin: "0.3rem 0 0" }}>
                  {plan.scope}
                </p>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.05rem", color: "#334155" }}>
                {plan.highlights.map((item) => (
                  <li key={item} style={{ marginBottom: "0.35rem" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container card" style={{ padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.35rem" }}>Pricing notes</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#475569" }}>
            {notes.map((item) => (
              <li key={item} style={{ marginBottom: "0.35rem" }}>
                {item}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            <Link href="/sign-up" className="btn primary">
              Start building
            </Link>
            <Link href="/streaming" className="btn secondary">
              Review streaming setup
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
