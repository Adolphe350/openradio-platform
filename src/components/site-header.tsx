import Link from "next/link";

type SiteHeaderProps = {
  showAuthActions?: boolean;
};

const marketingLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/streaming", label: "Streaming" },
  { href: "/automation", label: "Automation" },
  { href: "/pricing", label: "Pricing" }
];

export function SiteHeader({ showAuthActions = true }: SiteHeaderProps) {
  return (
    <header style={{ borderBottom: "1px solid #e2e8f0", backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.8)" }}>
      <div
        className="container"
        style={{
          minHeight: "74px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          padding: "0.45rem 0"
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            aria-hidden
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background:
                "conic-gradient(from 220deg at 50% 50%, #0284c7 0deg, #0ea5e9 160deg, #1e3a8a 300deg, #0284c7 360deg)"
            }}
          />
          <div>
            <strong style={{ fontSize: "1rem" }}>OpenRadio Cloud</strong>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              Open-source internet radio stack
            </p>
          </div>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
          {marketingLinks.map((link) => (
            <Link key={link.href} href={link.href} className="btn secondary" style={{ padding: "0.54rem 0.95rem" }}>
              {link.label}
            </Link>
          ))}
          {showAuthActions ? (
            <>
              <Link href="/sign-in" className="btn secondary">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn primary">
                Get started
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
