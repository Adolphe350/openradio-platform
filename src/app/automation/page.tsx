import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "AutoDJ Automation – OpenRadio",
  description: "Keep your station live 24/7 with playlist automation, schedule blocks, and show recording.",
};

const live = [
  { icon: "🎵", title: "Track Library", desc: "Upload MP3, FLAC, OGG, WAV, or AAC files directly to your station. Metadata is auto-detected from filename." },
  { icon: "📋", title: "Playlist Builder", desc: "Create multiple playlists, add tracks, and reorder. The AutoDJ plays from your playlists 24/7." },
  { icon: "🗓️", title: "Schedule Blocks", desc: "Define time-based programming slots. Assign a playlist to each block — mornings, evenings, weekends." },
  { icon: "🔀", title: "Random Rotation", desc: "The Liquidsoap AutoDJ engine shuffles your playlist so listeners always hear something fresh." },
];

const roadmap = [
  { icon: "🎙️", title: "Show Recording", desc: "Automatically record live shows and publish them as on-demand podcast episodes.", state: "Coming soon" },
  { icon: "⏱️", title: "Jingle Insertion", desc: "Schedule station IDs, ads, or jingles to play at defined intervals automatically.", state: "Coming soon" },
  { icon: "📊", title: "Rotation Rules", desc: "Set category rotations, repeat spacing, and artist separation rules.", state: "Planned" },
  { icon: "🤖", title: "Per-station Workers", desc: "Dedicated Liquidsoap process per station with Redis-backed queue orchestration.", state: "Planned" },
];

const steps = [
  "Create a playlist and name it for a daypart (e.g. Morning Mix, Late Night).",
  "Upload your tracks using the Tracks tab in your station studio.",
  "Add tracks to your playlist and set the running order.",
  "Open the Schedule tab and create time blocks for each daypart.",
  "Set your station status to ACTIVE — AutoDJ takes over immediately.",
];

export default function AutomationPage() {
  return (
    <main style={{ background: "var(--bg-page)" }}>
      <SiteHeader />

      <section style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "3rem 0 2.5rem" }}>
        <div className="container" style={{ display: "grid", gap: "1rem", maxWidth: 720 }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: 0 }}>AutoDJ Automation</p>
          <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.8rem)", margin: 0 }}>Set up a playlist for when you are offline</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, maxWidth: "62ch", fontSize: "1rem", lineHeight: 1.65 }}>
            OpenRadio&apos;s Liquidsoap-powered AutoDJ keeps your station live 24/7. Upload tracks, build playlists, set a schedule, and never go silent.
          </p>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <Link href="/dashboard" className="btn btn-primary">Open Studio Dashboard</Link>
            <Link href="/pricing" className="btn btn-secondary">View Pricing</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ display: "grid", gap: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.4rem" }}>Available Now</h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>These features are fully live and ready to use today.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1rem" }}>
            {live.map((f) => (
              <div key={f.title} className="card" style={{ padding: "1.25rem", display: "flex", gap: "0.85rem" }}>
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "0.95rem" }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: "0.845rem", color: "var(--text-muted)", lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0", background: "var(--bg)" }}>
        <div className="container" style={{ maxWidth: 680 }}>
          <h2 style={{ fontSize: "1.5rem", margin: "0 0 1.25rem" }}>Recommended First Automation Loop</h2>
          <div className="card" style={{ overflow: "hidden" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1rem 1.25rem", borderBottom: i < steps.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.6 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ display: "grid", gap: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.4rem" }}>Coming Soon</h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>These automation features are on the roadmap.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1rem" }}>
            {roadmap.map((f) => (
              <div key={f.title} className="card" style={{ padding: "1.25rem", display: "flex", gap: "0.85rem", opacity: 0.75 }}>
                <div className="feature-icon" style={{ background: "#f1f5f9", color: "var(--text-muted)" }}>{f.icon}</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>{f.title}</p>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, background: "#f1f5f9", color: "var(--text-muted)", padding: "0.1rem 0.5rem", borderRadius: 999 }}>{f.state}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.845rem", color: "var(--text-muted)", lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0", background: "var(--bg-dark)" }}>
        <div className="container" style={{ textAlign: "center", display: "grid", gap: "1rem", justifyItems: "center" }}>
          <h2 style={{ color: "#fff", fontSize: "1.8rem", margin: 0 }}>Start automating your station</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: "44ch" }}>Upload tracks, build playlists, and let AutoDJ keep you on air 24/7.</p>
          <Link href="/sign-up" className="btn btn-primary btn-lg">Create Free Station</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
