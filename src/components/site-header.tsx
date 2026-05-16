import Link from "next/link";

type SiteHeaderProps = {
  showAuthActions?: boolean;
};

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/streaming", label: "Streaming" },
  { href: "/automation", label: "Automation" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader({ showAuthActions = true }: SiteHeaderProps) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px) saturate(180%)",
        background: "rgba(255, 255, 255, 0.85)",
      }}
    >
      <div
        className="container"
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            aria-hidden
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
            }}
          />
          <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>
            OpenRadio
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "0.4rem 0.75rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--text-secondary)",
                borderRadius: "var(--radius-sm)",
                transition: "all 150ms",
              }}
            >
              {link.label}
            </Link>
          ))}
          {showAuthActions ? (
            <div style={{ display: "flex", gap: "0.4rem", marginLeft: "0.75rem" }}>
              <Link href="/sign-in" className="btn secondary">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn primary">
                Get started
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
