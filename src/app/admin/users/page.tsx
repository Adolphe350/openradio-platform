import Link from "next/link";

import { requireSuperAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

type Props = { searchParams: Promise<{ query?: string }> };

export const metadata = { title: "Manage Users – OpenRadio Admin" };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireSuperAdmin();
  const { query = "" } = await searchParams;
  const trimmedQuery = query.trim();

  const users = await db.user.findMany({
    where: trimmedQuery
      ? {
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { email: { contains: trimmedQuery, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      _count: { select: { stations: true, podcasts: true, sessions: true } },
      stations: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { metrics: { orderBy: { sampledAt: "desc" }, take: 1 } },
      },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">User Accounts</h1>
          <p className="dash-page-sub">See broadcasters, their radios, sessions, podcasts, and plans.</p>
        </div>
        <Link href="/admin" className="btn btn-secondary">Admin overview</Link>
      </div>

      <form className="card" style={{ padding: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: "0.25rem", flex: "1 1 280px" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>Search user</span>
          <input name="query" defaultValue={query} placeholder="Name or email..." />
        </label>
        <button className="btn btn-primary" type="submit">Search</button>
      </form>

      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="table-scroll">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem", minWidth: 620 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "0.65rem" }}>User</th>
              <th style={{ padding: "0.65rem" }}>Radios</th>
              <th style={{ padding: "0.65rem" }}>Live listeners</th>
              <th style={{ padding: "0.65rem" }}>Plan</th>
              <th style={{ padding: "0.65rem" }}>Sessions</th>
              <th style={{ padding: "0.65rem" }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const liveListeners = user.stations.reduce((sum, station) => sum + (station.metrics[0]?.currentListeners ?? 0), 0);
              const activeStations = user.stations.filter((station) => station.status === "ACTIVE").length;
              const subscription = user.subscriptions[0];
              return (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "0.75rem 0.65rem", minWidth: 230 }}>
                    <div style={{ fontWeight: 800 }}>{user.name}</div>
                    <div style={{ color: "var(--text-light)", fontSize: "0.74rem", wordBreak: "break-all" }}>{user.email}</div>
                  </td>
                  <td style={{ padding: "0.75rem 0.65rem", minWidth: 180 }}>
                    <div style={{ fontWeight: 800 }}>{user._count.stations} total · {activeStations} active</div>
                    <div style={{ color: "var(--text-light)", fontSize: "0.74rem" }}>
                      {user.stations.slice(0, 3).map((station) => station.name).join(", ") || "No stations yet"}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 0.65rem", fontWeight: 900 }}>{liveListeners}</td>
                  <td style={{ padding: "0.75rem 0.65rem" }}>{subscription ? `${subscription.plan.name} (${subscription.status})` : "No plan"}</td>
                  <td style={{ padding: "0.75rem 0.65rem" }}>{user._count.sessions}</td>
                  <td style={{ padding: "0.75rem 0.65rem" }}>{formatDate(user.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
