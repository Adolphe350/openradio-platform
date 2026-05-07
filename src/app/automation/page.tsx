import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Automation",
  description: "Use OpenRadio playlist automation baseline and understand planned orchestration upgrades."
};

const nowFeatures = [
  {
    title: "Track library",
    details: "Create track metadata entries with title, artist, album, duration, and optional file URL."
  },
  {
    title: "Playlist builder",
    details: "Create multiple playlists, add tracks, and reorder playlist sequence directly in station studio."
  },
  {
    title: "AutoDJ baseline",
    details: "Liquidsoap baseline service validates stream automation plumbing for iterative expansion."
  }
];

const nextFeatures = [
  {
    title: "Schedule blocks",
    details: "Time-based programming blocks and day-part scheduling are planned.",
    state: "Planned"
  },
  {
    title: "Rule-based rotations",
    details: "Category rotations, repeat spacing, and clock-rule constraints are planned.",
    state: "Planned"
  },
  {
    title: "Station automation workers",
    details: "Per-station queue-backed orchestration with Redis workers is planned.",
    state: "Planned"
  }
];

export default function AutomationPage() {
  return (
    <main>
      <SiteHeader />

      <section style={{ padding: "2.7rem 0 1.6rem" }}>
        <div className="container" style={{ display: "grid", gap: "0.85rem" }}>
          <span className="badge">Creator workflow</span>
          <h1 style={{ margin: 0, fontSize: "clamp(1.9rem, 4.5vw, 2.8rem)" }}>Automation that starts simple and scales deliberately</h1>
          <p className="muted" style={{ margin: 0, maxWidth: "74ch" }}>
            OpenRadio Cloud focuses on practical automation foundations today while clearly showing where scheduling and
            orchestration features are heading next.
          </p>
          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="btn primary">
              Open station studio
            </Link>
            <Link href="/pricing" className="btn secondary">
              View operational tiers
            </Link>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container" style={{ display: "grid", gap: "0.8rem" }}>
          <h2 style={{ margin: 0 }}>Available now</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            {nowFeatures.map((item) => (
              <article key={item.title} className="card" style={{ padding: "1rem" }}>
                <h3 style={{ marginBottom: "0.3rem" }}>{item.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {item.details}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container" style={{ display: "grid", gap: "0.8rem" }}>
          <h2 style={{ margin: 0 }}>Roadmap items (not yet live)</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            {nextFeatures.map((item) => (
              <article key={item.title} className="card" style={{ padding: "1rem", borderColor: "#d8b4fe", background: "#fcf8ff" }}>
                <span className="badge">{item.state}</span>
                <h3 style={{ margin: "0.55rem 0 0.3rem" }}>{item.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {item.details}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: "1.5rem" }}>
        <div className="container card" style={{ padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.4rem" }}>Recommended first automation loop</h2>
          <ol style={{ margin: 0, paddingLeft: "1.15rem", color: "#334155" }}>
            <li style={{ marginBottom: "0.35rem" }}>Create a default playlist and one secondary playlist for experiments.</li>
            <li style={{ marginBottom: "0.35rem" }}>Add 10-20 tracks with complete metadata fields.</li>
            <li style={{ marginBottom: "0.35rem" }}>Reorder tracks to avoid artist/title clustering.</li>
            <li>Publish station page and monitor analytics cards for baseline behavior.</li>
          </ol>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
