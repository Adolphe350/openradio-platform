import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Streaming Setup – OpenRadio",
  description: "Connect any Icecast-compatible encoder and go live with your internet radio station.",
};

const steps = [
  { num: "01", title: "Create a Station", desc: "Sign up and create your station in the dashboard. A unique mount path and source credentials are generated instantly." },
  { num: "02", title: "Configure Your Encoder", desc: "Open RadioBOSS, BUTT, Mixxx, OBS, or Liquidsoap. Enter the host, port, mount, username, and password from your station's Credentials tab." },
  { num: "03", title: "Start Broadcasting", desc: "Click connect in your encoder. Your stream goes live on Icecast immediately. Confirm audio on your public station page." },
  { num: "04", title: "Publish & Share", desc: "Set your station status to ACTIVE in the dashboard. Your station appears on the Explore page and is shareable via its public URL." },
];

const encoders = [
  { name: "RadioBOSS", type: "Windows", desc: "Professional broadcasting software with scheduling, automation, and cart wall." },
  { name: "BUTT", type: "Cross-platform", desc: "Broadcast Using This Tool — simple, reliable Icecast/SHOUTcast streaming." },
  { name: "Mixxx", type: "Cross-platform", desc: "Free DJ software with live broadcasting and BPM detection." },
  { name: "OBS Studio", type: "Cross-platform", desc: "Open source streaming software. Use the custom Icecast output." },
  { name: "Liquidsoap", type: "Linux/Docker", desc: "Scriptable radio automation — powers the built-in AutoDJ." },
  { name: "ices2", type: "Linux", desc: "Lightweight command-line Icecast source client." },
];

const specs = [
  { label: "Protocol", value: "Icecast 2 (HTTP PUT or legacy SOURCE)" },
  { label: "Recommended bitrate", value: "128 kbps (Starter) · 192 kbps (Prime) · 320 kbps (Premier)" },
  { label: "Formats", value: "MP3, AAC, OGG Vorbis" },
  { label: "Sample rate", value: "44,100 Hz stereo recommended" },
  { label: "Metadata", value: "ICY StreamTitle injected by encoder" },
];

export default function StreamingPage() {
  return (
    <main style={{ background: "var(--bg-page)" }}>
      <SiteHeader />

      <section style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "3rem 0 2.5rem" }}>
        <div className="container" style={{ display: "grid", gap: "1rem", maxWidth: 720 }}>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: 0 }}>Streaming Setup</p>
          <h1 style={{ fontSize: "clamp(1.8rem,4.5vw,2.8rem)", margin: 0 }}>Your source for radio streaming</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, maxWidth: "62ch", fontSize: "1rem", lineHeight: 1.65 }}>
            Connect any Icecast-compatible encoder and go live in minutes. OpenRadio handles the infrastructure — you focus on the broadcast.
          </p>
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <Link href="/sign-up" className="btn btn-primary">Start Your Free Trial</Link>
            <Link href="/dashboard/stations/new" className="btn btn-secondary">Create a Station</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ display: "grid", gap: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", margin: 0, textAlign: "center" }}>Go live in 4 steps</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1rem" }}>
            {steps.map((s) => (
              <div key={s.num} className="card" style={{ padding: "1.5rem", display: "grid", gap: "0.65rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--brand)", opacity: 0.4, fontFamily: "monospace", lineHeight: 1 }}>{s.num}</span>
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0", background: "var(--bg)" }}>
        <div className="container" style={{ display: "grid", gap: "2rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.4rem" }}>Supported Encoders</h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>Any Icecast2-compatible software works. Here are the most popular choices.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "1rem" }}>
            {encoders.map((e) => (
              <div key={e.name} className="card" style={{ padding: "1.25rem", display: "flex", gap: "0.85rem" }}>
                <div className="feature-icon">🎙️</div>
                <div>
                  <p style={{ margin: "0 0 0.15rem", fontWeight: 700, fontSize: "0.95rem" }}>{e.name}</p>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", color: "var(--brand)", fontWeight: 600 }}>{e.type}</p>
                  <p style={{ margin: 0, fontSize: "0.845rem", color: "var(--text-muted)", lineHeight: 1.55 }}>{e.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <h2 style={{ fontSize: "1.5rem", margin: "0 0 1.25rem" }}>Stream Specifications</h2>
          <div className="card stream-spec-card" style={{ overflow: "hidden" }}>
            <table className="data-table stream-spec-table">
              <tbody>
                {specs.map((row) => (
                  <tr key={row.label}>
                    <td style={{ fontWeight: 600, width: "35%", fontSize: "0.875rem" }}>{row.label}</td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section style={{ padding: "3rem 0", background: "var(--bg-dark)" }}>
        <div className="container" style={{ textAlign: "center", display: "grid", gap: "1rem", justifyItems: "center" }}>
          <h2 style={{ color: "#fff", fontSize: "1.8rem", margin: 0 }}>Ready to go live?</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", margin: 0, maxWidth: "44ch" }}>Create your station for free and broadcast to the world in minutes.</p>
          <Link href="/sign-up" className="btn btn-primary btn-lg">Create Your Station</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
