import Link from "next/link";

import { signOutAction } from "@/app/(auth)/auth-actions";

type DashboardShellProps = {
  userName: string;
  children: React.ReactNode;
};

export function DashboardShell({ userName, children }: DashboardShellProps) {
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
