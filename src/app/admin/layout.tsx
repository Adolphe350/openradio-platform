import Link from "next/link";

import { requireSuperAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/(auth)/auth-actions";
import { DashboardMobileShell } from "@/components/dashboard-mobile-shell";

export const metadata = { title: "Super Admin – OpenRadio" };

const links = [
  { href: "/admin", label: "Overview", icon: "🛡️" },
  { href: "/admin/stations", label: "Stations", icon: "📻" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/dashboard", label: "My Studio", icon: "🎛️" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebar = (
    <>
      <Link href="/admin" className="sidebar-logo">
        <div className="sidebar-logo-icon">O</div>
        <span className="sidebar-logo-text">openradio</span>
      </Link>

      <nav className="sidebar-nav">
        <div>
          <p className="sidebar-section-label">Super Admin</p>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="sidebar-link">
              <span style={{ fontSize: "0.95rem", width: 20, textAlign: "center", flexShrink: 0 }}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <p className="sidebar-user-name">{user.name}</p>
            <p className="sidebar-user-role">Super Admin</p>
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
      <DashboardMobileShell title="Admin Menu">
        <aside className="dashboard-sidebar dashboard-sidebar-drawer">{sidebar}</aside>
      </DashboardMobileShell>

      <aside className="dashboard-sidebar dashboard-sidebar-desktop">{sidebar}</aside>

      <div className="dashboard-content">{children}</div>
    </div>
  );
}
