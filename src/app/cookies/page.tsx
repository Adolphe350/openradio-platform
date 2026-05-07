import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Cookie Policy – OpenRadio",
  description: "How OpenRadio Cloud uses cookies.",
};

const cookies = [
  {
    name: "orc_session",
    purpose: "Authentication — keeps you logged in across page loads.",
    type: "Essential",
    duration: "30 days (or until sign-out)",
    party: "First-party",
  },
];

export default function CookiesPage() {
  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <SiteHeader />
      <section style={{ padding: "3rem 0 5rem" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: "0 0 0.5rem" }}>Legal</p>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", margin: "0 0 0.4rem" }}>Cookie Policy</h1>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div style={{ display: "grid", gap: "1.25rem" }}>
            <div className="card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1rem", margin: "0 0 0.6rem" }}>What Are Cookies</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7, fontSize: "0.9rem" }}>
                Cookies are small text files stored on your device by your browser. OpenRadio Cloud uses only the minimum cookies necessary to operate the service. We do not use advertising cookies, analytics tracking cookies, or any third-party cookies.
              </p>
            </div>

            <div className="card" style={{ padding: "1.5rem", overflow: "hidden" }}>
              <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Cookies We Use</h2>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cookie name</th>
                      <th>Purpose</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cookies.map((c) => (
                      <tr key={c.name}>
                        <td><code style={{ fontSize: "0.82rem" }}>{c.name}</code></td>
                        <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{c.purpose}</td>
                        <td>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "var(--brand-light)", color: "var(--brand-dark)", padding: "0.15rem 0.5rem", borderRadius: 999 }}>
                            {c.type}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.875rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{c.duration}</td>
                        <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{c.party}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1rem", margin: "0 0 0.6rem" }}>Managing Cookies</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7, fontSize: "0.9rem" }}>
                You can block or delete cookies through your browser settings at any time. Blocking the session cookie will prevent you from staying logged in, but you can still browse public station pages and the Explore directory without signing in.
              </p>
            </div>

            <div className="card" style={{ padding: "1.5rem" }}>
              <h2 style={{ fontSize: "1rem", margin: "0 0 0.6rem" }}>No Third-Party Tracking</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7, fontSize: "0.9rem" }}>
                OpenRadio Cloud does not load any third-party scripts, analytics pixels, or ad network cookies. Your listening habits and browsing behaviour are never shared with external services.
              </p>
            </div>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <Link href="/privacy" className="btn btn-secondary btn-sm">Privacy Policy</Link>
            <Link href="/terms" className="btn btn-secondary btn-sm">Terms of Service</Link>
            <Link href="/" className="btn btn-secondary btn-sm">← Home</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
