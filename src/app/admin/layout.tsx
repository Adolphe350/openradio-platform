import Link from "next/link";

import { requireSuperAdmin } from "@/lib/admin";
import { signOutAction } from "@/app/(auth)/auth-actions";
import { Icon, LogoMark, type IconName } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = { title: "Super Admin – OpenRadio" };

const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Overview", icon: "admin" },
  { href: "/admin/stations", label: "Stations", icon: "radio" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/dashboard", label: "My studio", icon: "dashboard" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="studio-shell admin-shell">
      <aside className="studio-sidebar admin-sidebar" aria-label="Admin menu">
        <div className="studio-side-head">
          <Link href="/admin" className="studio-brand" aria-label="OpenRadio Cloud admin">
            <LogoMark size={30} />
            <span className="studio-brand-text">OpenRadio<span>Admin</span></span>
          </Link>
        </div>
        <nav className="studio-nav" aria-label="Super admin">
          <p className="studio-nav-group">Super admin</p>
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="studio-nav-link">
                  <Icon name={link.icon} size={18} />
                  <span className="studio-nav-label">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="studio-side-foot">
          <div className="studio-user">
            <span className="studio-avatar" aria-hidden="true">{initials}</span>
            <span className="studio-user-text">
              <span className="studio-user-name">{user.name}</span>
              <span className="studio-user-mail">Super admin</span>
            </span>
          </div>
          <div className="studio-foot-actions">
            <ThemeToggle />
            <form action={signOutAction}>
              <button className="studio-icon-btn" type="submit" aria-label="Sign out" title="Sign out">
                <Icon name="logout" size={18} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="studio-main">
        <main id="main" className="studio-content">{children}</main>
      </div>
    </div>
  );
}
