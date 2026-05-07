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
        <div style={{ display: "grid", gap: "1rem", position: "sticky", top: 16 }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "1.03rem" }}>OpenRadio Cloud</p>
            <p className="muted" style={{ margin: "0.2rem 0 0" }}>
              {userName}
            </p>
          </div>
          <nav style={{ display: "grid", gap: "0.4rem" }}>
            <Link href="/dashboard" className="btn secondary" style={{ justifyContent: "flex-start" }}>
              Stations
            </Link>
            <Link href="/dashboard/stations/new" className="btn secondary" style={{ justifyContent: "flex-start" }}>
              Create station
            </Link>
            <Link href="/explore" className="btn secondary" style={{ justifyContent: "flex-start" }}>
              Explore
            </Link>
            <Link href="/streaming" className="btn secondary" style={{ justifyContent: "flex-start" }}>
              Streaming guide
            </Link>
            <Link href="/" className="btn secondary" style={{ justifyContent: "flex-start" }}>
              Landing page
            </Link>
          </nav>
          <form action={signOutAction}>
            <button className="btn secondary" type="submit" style={{ width: "100%", justifyContent: "flex-start" }}>
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <div style={{ padding: "1rem 1.2rem" }}>{children}</div>
    </div>
  );
}
