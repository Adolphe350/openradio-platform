import Link from "next/link";

const cols = [
  {
    title: "Listen Now",
    links: [
      { label: "Explore All Stations", href: "/explore" },
      { label: "Music Radio", href: "/explore?genre=Music" },
      { label: "News Radio", href: "/explore?genre=News" },
      { label: "Religious Radio", href: "/explore?genre=Religious" },
      { label: "Sports Radio", href: "/explore?genre=Sports" },
      { label: "By Genre", href: "/explore" },
      { label: "By Location", href: "/explore" },
      { label: "By Language", href: "/explore" },
    ],
  },
  {
    title: "Creators",
    links: [
      { label: "Create a Station", href: "/sign-up" },
      { label: "Streaming Setup", href: "/streaming" },
      { label: "AutoDJ Automation", href: "/automation" },
      { label: "Pricing", href: "/pricing" },
      { label: "Studio Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Partner With Us",
    links: [
      { label: "Get Started Free", href: "/sign-up" },
      { label: "View Pricing", href: "/pricing" },
      { label: "GitHub", href: "https://github.com/Adolphe350/openradio-platform" },
      { label: "Help & Docs", href: "/streaming" },
    ],
  },
];

const social = [
  { label: "GitHub", href: "https://github.com/Adolphe350/openradio-platform" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        {/* Top: logo + columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr repeat(3, 1fr)",
            gap: "2.5rem",
            paddingBottom: "2.5rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Brand column */}
          <div style={{ display: "grid", gap: "0.8rem", alignContent: "start" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", textDecoration: "none" }}>
              <div
                style={{
                  width: "30px", height: "30px", borderRadius: "8px",
                  background: "var(--brand)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, color: "#fff", fontSize: "0.95rem",
                }}
              >
                O
              </div>
              <span className="footer-logo-name">openradio</span>
            </Link>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.5)", margin: 0, maxWidth: "28ch", lineHeight: 1.6 }}>
              Free, open-source internet radio hosting. Launch your station today.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              {social.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", color: "rgba(255,255,255,0.7)",
                    transition: "background 150ms",
                    textDecoration: "none",
                  }}
                >
                  GH
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {cols.map((col) => (
            <div key={col.title}>
              <p className="footer-col-title">{col.title}</p>
              <div style={{ display: "grid", gap: "0" }}>
                {col.links.map((link) => (
                  <Link key={link.href + link.label} href={link.href} className="footer-link">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>
            © {new Date().getFullYear()} OpenRadio Cloud · MIT Licensed · Open-source, not affiliated with any commercial platform.
          </p>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Cookies", href: "/cookies" },
            ].map((l) => (
              <Link key={l.label} href={l.href} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", transition: "color 150ms" }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
