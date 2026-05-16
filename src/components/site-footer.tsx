import Link from "next/link";

const cols = [
  {
    title: "Listen",
    links: [
      { href: "/explore", label: "Explore stations" },
      { href: "/", label: "Home" },
    ],
  },
  {
    title: "Create",
    links: [
      { href: "/streaming", label: "Streaming" },
      { href: "/automation", label: "Automation" },
      { href: "/pricing", label: "Pricing" },
      { href: "/sign-up", label: "Create account" },
    ],
  },
  {
    title: "Manage",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: "4rem", background: "var(--bg-elevated)" }}>
      <div className="container" style={{ padding: "3rem 0 2rem" }}>
        <div
          className="grid"
          style={{ gridTemplateColumns: "2fr repeat(3, 1fr)", marginBottom: "2rem", gap: "2rem" }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              />
              <span style={{ fontWeight: 700 }}>OpenRadio</span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.85rem", maxWidth: "280px", lineHeight: 1.6 }}>
              Self-hosted internet radio platform. Full ownership of your streams, data, and infrastructure.
            </p>
          </div>
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: "0.75rem" }}>
                {group.title}
              </h3>
              <div style={{ display: "grid", gap: "0.4rem" }}>
                {group.links.map((link) => (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
          <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
            OpenRadio Cloud. Open-source, self-hosted internet radio platform.
          </p>
        </div>
      </div>
    </footer>
  );
}
