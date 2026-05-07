import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Pricing – OpenRadio",
  description: "Free, open-source internet radio hosting. Choose the plan that fits your station.",
};

const plans = [
  {
    name: "Starter",
    tagline: "Suited for small creators that want to get serious about radio.",
    price: { monthly: "Free", yearly: "Free" },
    cta: "Start Your 7-Day Free Trial",
    recommended: false,
    features: [
      "Up to 5,000 concurrent listeners",
      "400,000 total listening hours / month",
      "Up to 3 podcasts / shows",
      "128 kbps streaming quality",
      "AutoDJ playlist automation",
      "Show recording",
      "Ad insertion ready",
      "Standard support",
    ],
  },
  {
    name: "Prime",
    tagline: "Suited for pro creators that want to get the most out of their radio stations.",
    price: { monthly: "Infra cost", yearly: "Infra cost" },
    cta: "Subscribe Now",
    recommended: true,
    features: [
      "Up to 25,000 concurrent listeners",
      "1,000,000 total listening hours / month",
      "Up to 50 podcasts / shows",
      "192 kbps streaming quality",
      "50 GB AutoDJ storage",
      "Up to 3 call-to-listen lines per station",
      "Geo-blocking & relay streams",
      "Royalty reports",
      "Advanced support",
    ],
  },
  {
    name: "Premier",
    tagline: "Suited for broadcasting networks with larger needs, offering advanced features and scalability.",
    price: { monthly: "Custom", yearly: "Custom" },
    cta: "Subscribe Now",
    recommended: false,
    features: [
      "Unlimited concurrent listeners",
      "2,500,000 total listening hours / month",
      "Up to 250 podcasts / shows",
      "320 kbps streaming quality",
      "100 GB AutoDJ storage",
      "Up to 5 call-to-listen lines per station",
      "Live personal setup",
      "Priority enterprise support",
      "Custom relay & failover",
    ],
  },
];

const extras = [
  { icon: "📡", title: "No Studio Required", desc: "Stream from any device using any Icecast-compatible encoder." },
  { icon: "🤖", title: "Go Live Instantly", desc: "Get encoder credentials immediately after creating your station." },
  { icon: "🎙️", title: "AutoDJ Always-On", desc: "Playlist automation keeps your station live 24/7 between shows." },
  { icon: "📊", title: "Deep Analytics", desc: "Track listeners, peak times, and geographic reach over time." },
  { icon: "💰", title: "Monetization", desc: "Built-in audio ad insertion to turn your audience into revenue." },
  { icon: "📞", title: "Call-to-Listen", desc: "Dedicated phone lines so listeners can tune in by calling." },
];

export default function PricingPage() {
  return (
    <main style={{ background: "var(--bg-page)" }}>
      <SiteHeader />

      {/* Header */}
      <section style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "3rem 0 2.5rem", textAlign: "center" }}>
        <div className="container" style={{ display: "grid", gap: "1rem", justifyItems: "center" }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: 0 }}>
            Pricing
          </p>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", margin: 0 }}>
            Plans for every creator
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, maxWidth: "52ch", fontSize: "1rem" }}>
            Start for free on your own infrastructure. Scale as your audience grows.
            No platform lock-in, no hidden fees.
          </p>

          {/* Monthly / Yearly toggle (visual only — open-source, costs are infra) */}
          <div
            style={{
              display: "inline-flex",
              background: "var(--bg-page)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "0.25rem",
              marginTop: "0.5rem",
            }}
          >
            {["Monthly", "Yearly"].map((label, i) => (
              <span
                key={label}
                style={{
                  padding: "0.4rem 1.1rem",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: i === 0 ? "var(--bg)" : "transparent",
                  color: i === 0 ? "var(--text)" : "var(--text-muted)",
                  boxShadow: i === 0 ? "var(--shadow-sm)" : "none",
                  transition: "all 150ms",
                }}
              >
                {label}
                {i === 1 && (
                  <span style={{ marginLeft: "0.4rem", fontSize: "0.7rem", background: "var(--brand-light)", color: "var(--brand-dark)", padding: "0.1rem 0.4rem", borderRadius: "999px", fontWeight: 700 }}>
                    Save 20%
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.25rem", alignItems: "start" }}>
          {plans.map((plan) => (
            <div key={plan.name} className={`pricing-card${plan.recommended ? " recommended" : ""}`}>
              {plan.recommended && (
                <div className="pricing-recommended-badge">Recommended</div>
              )}

              <div>
                <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.4rem" }}>{plan.name}</h2>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{plan.tagline}</p>
              </div>

              <div>
                <div className="pricing-price">{plan.price.monthly}</div>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {plan.name === "Starter" ? "Self-hosted forever" : plan.name === "Prime" ? "Your infrastructure" : "Bring your architecture"}
                </p>
              </div>

              <Link
                href="/sign-up"
                className={`btn btn-full btn-lg${plan.recommended ? " btn-primary" : " btn-secondary"}`}
              >
                {plan.cta}
              </Link>

              <hr className="divider" />

              <ul className="pricing-check-list">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: "3rem 0", background: "var(--bg)" }}>
        <div className="container" style={{ display: "grid", gap: "2.5rem" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(1.5rem,3.5vw,2.2rem)", margin: "0 0 0.6rem" }}>Tons of features, all plans</h2>
            <p style={{ color: "var(--text-muted)", margin: 0, maxWidth: "48ch", marginInline: "auto" }}>
              Every tier includes all core broadcasting capabilities.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1rem" }}>
            {extras.map((f) => (
              <div key={f.title} className="card" style={{ padding: "1.25rem", display: "flex", gap: "0.9rem" }}>
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "0.9rem" }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: "0.845rem", color: "var(--text-muted)", lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "3rem 0", background: "var(--bg-dark)" }}>
        <div className="container" style={{ textAlign: "center", display: "grid", gap: "1.2rem", justifyItems: "center" }}>
          <h2 style={{ color: "#fff", fontSize: "clamp(1.5rem,3.5vw,2.2rem)", margin: 0 }}>
            Join the OpenRadio Community Today
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: "46ch", fontSize: "0.95rem" }}>
            Start broadcasting for free. Open-source and self-hosted — you own everything.
          </p>
          <Link href="/sign-up" className="btn btn-primary btn-lg">
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
