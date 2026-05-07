import Link from "next/link";

const footerGroups = [
  {
    title: "Listener",
    links: [
      { href: "/explore", label: "Explore stations" },
      { href: "/", label: "Home" }
    ]
  },
  {
    title: "Creator",
    links: [
      { href: "/streaming", label: "Streaming" },
      { href: "/automation", label: "Automation" },
      { href: "/pricing", label: "Pricing" },
      { href: "/sign-up", label: "Create account" }
    ]
  },
  {
    title: "Workspace",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/dashboard", label: "Dashboard" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid #dbe3ed", marginTop: "2.5rem", background: "rgba(255,255,255,0.72)" }}>
      <div className="container" style={{ padding: "2rem 0" }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", marginBottom: "1.1rem" }}>
          {footerGroups.map((group) => (
            <section key={group.title}>
              <h2 style={{ fontSize: "1rem", marginBottom: "0.4rem" }}>{group.title}</h2>
              <div style={{ display: "grid", gap: "0.35rem" }}>
                {group.links.map((link) => (
                  <Link key={link.href + link.label} href={link.href} className="muted" style={{ fontSize: "0.92rem" }}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="muted" style={{ marginBottom: 0, fontSize: "0.84rem" }}>
          OpenRadio Cloud keeps original branding, copy, design, and implementation. It is not affiliated with or copied
          from third-party radio platforms.
        </p>
      </div>
    </footer>
  );
}
