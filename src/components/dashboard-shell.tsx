import Link from "next/link";
import { signOutAction } from "@/app/(auth)/auth-actions";

type Props = { userName: string; isSuperAdmin?: boolean; children: React.ReactNode };

const navSections = [
  {
    label: "Studio",
    links: [
      { href: "/dashboard", icon: "🏠", label: "Overview" },
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

  return (
    <div className="dashboard-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="dashboard-sidebar">
        {/* Logo */}
        <Link href="/" className="sidebar-logo" style={{ flexShrink: 0 }}>
          <div className="sidebar-logo-icon">O</div>
          <span className="sidebar-logo-text">openradio</span>
        </Link>

        {/* Nav */}
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

        {/* Sign-out visible in mobile horizontal nav */}
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

        {/* Bottom: user + sign out (desktop only) */}
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
      </aside>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="dashboard-content">
        {children}
      </div>
    </div>
  );
}
