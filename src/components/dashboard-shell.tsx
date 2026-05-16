import Link from "next/link";
import { signOutAction } from "@/app/(auth)/auth-actions";
import { DashboardMobileShell } from "@/components/dashboard-mobile-shell";

type Props = { userName: string; isSuperAdmin?: boolean; children: React.ReactNode };

const navSections = [
  {
    label: "Studio",
    links: [
      { href: "/dashboard", icon: "🏠", label: "Overview" },
      { href: "/dashboard/studio", icon: "🎙", label: "Studio" },
      { href: "/dashboard/music", icon: "🎵", label: "Music" },
      { href: "/dashboard/stations/new", icon: "+", label: "Create Station" },
      { href: "/dashboard/analytics", icon: "📊", label: "Analytics" },
      { href: "/dashboard/podcasts", icon: "🎙", label: "Podcasts" },
    ],
  },
  {
    label: "Discover",
    links: [
      { href: "/explore", icon: "🌍", label: "Explore" },
      { href: "/pricing", icon: "💳", label: "Pricing" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
      { href: "/dashboard/settings/billing", icon: "💳", label: "Billing" },
    ],
  },
];

export function DashboardShell({ userName, isSuperAdmin = false, children }: Props) {
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sections = isSuperAdmin
    ? [
        { label: "Admin", links: [{ href: "/admin", icon: "🛡️", label: "Super Admin" }] },
        ...navSections,
      ]
    : navSections;

  const sidebar = (
    <>
      <Link href="/" className="sidebar-logo" style={{ flexShrink: 0 }}>
        <div className="sidebar-logo-icon">O</div>
        <span className="sidebar-logo-text">openradio</span>
      </Link>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="sidebar-section-label">{section.label}</p>
            {section.links.map((link) => (
              <Link key={link.href} href={link.href} className="sidebar-link">
                <span style={{ fontSize: "0.95rem", width: 20, textAlign: "center", flexShrink: 0 }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-mobile-signout" style={{ flexShrink: 0, padding: "0 0.5rem" }}>
        <form action={signOutAction}>
          <button
            className="sidebar-link"
            type="submit"
            title="Sign out"
            style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", whiteSpace: "nowrap" }}
          >
            <span style={{ fontSize: "0.9rem", width: 20, textAlign: "center" }}>→</span>
            Sign out
          </button>
        </form>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <p className="sidebar-user-name">{userName}</p>
            <p className="sidebar-user-role">{isSuperAdmin ? "Super Admin" : "Creator"}</p>
          </div>
        </div>
        <form action={signOutAction} style={{ marginTop: "0.4rem" }}>
          <button className="sidebar-link" type="submit" style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.825rem" }}>
            <span style={{ fontSize: "0.9rem", width: 20, textAlign: "center" }}>→</span>
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div style={{ display: "grid", gap: "1.5rem", position: "sticky", top: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              />
              <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>OpenRadio</span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>{userName}</p>
          </div>

          <nav style={{ display: "grid", gap: "0.25rem" }}>
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", transition: "all 150ms" }}>
              Stations
            </Link>
            <Link href="/dashboard/stations/new" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", transition: "all 150ms" }}>
              New station
            </Link>
            <Link href="/explore" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", transition: "all 150ms" }}>
              Explore
            </Link>
            <Link href="/streaming" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", transition: "all 150ms" }}>
              Streaming guide
            </Link>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.75rem", borderRadius: "var(--radius-sm)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-secondary)", transition: "all 150ms" }}>
              Home
            </Link>
          </nav>

          <form action={signOutAction}>
            <button
              className="btn secondary"
              type="submit"
              style={{ width: "100%", justifyContent: "flex-start", fontSize: "0.85rem" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div style={{ padding: "1.5rem 2rem", overflowY: "auto" }}>{children}</div>
    </div>
  );
}
