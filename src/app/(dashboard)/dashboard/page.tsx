import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";
import { DashboardStats } from "./dashboard-stats";

export const metadata = {
  title: "Dashboard - OpenRadio",
};

interface DataPoint {
  label: string;
  value: number;
}

function getStationColor(id: string): string {
  const colors = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  ];
  const hash = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default async function DashboardPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: { tracks: true, playlists: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate mock metrics (replace with real analytics later)
  const totalStations = stations.length;
  const activeStations = stations.filter((s) => s.status === "ACTIVE").length;
  const totalTracks = stations.reduce((sum, s) => sum + s._count.tracks, 0);

  // Mock listener data
  const thisWeekTotal = Math.floor(Math.random() * 5000) + 1000;
  const lastWeekTotal = Math.floor(thisWeekTotal * (0.7 + Math.random() * 0.4));
  const pctChange = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;

  const thisWeek: DataPoint[] = [
    { label: "Mon", value: Math.floor(Math.random() * 800) + 200 },
    { label: "Tue", value: Math.floor(Math.random() * 800) + 200 },
    { label: "Wed", value: Math.floor(Math.random() * 800) + 200 },
    { label: "Thu", value: Math.floor(Math.random() * 800) + 200 },
    { label: "Fri", value: Math.floor(Math.random() * 800) + 200 },
    { label: "Sat", value: Math.floor(Math.random() * 800) + 200 },
    { label: "Sun", value: Math.floor(Math.random() * 800) + 200 },
  ];

  const lastWeek: DataPoint[] = thisWeek.map((d) => ({
    ...d,
    value: Math.floor(d.value * (0.7 + Math.random() * 0.4)),
  }));

  const statCards = [
    {
      label: "Total Stations",
      value: totalStations.toString(),
      change: null,
    },
    {
      label: "Live Now",
      value: activeStations.toString(),
      change: null,
    },
    {
      label: "Total Tracks",
      value: totalTracks.toLocaleString(),
      change: null,
    },
    {
      label: "Listeners This Week",
      value: thisWeekTotal.toLocaleString(),
      change: pctChange,
    },
  ];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
      <div style={{ marginBottom: "40px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "var(--text)", marginBottom: "8px", letterSpacing: "-0.02em" }}>
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "16px" }}>
            Your stations overview with your stations today
          </p>
        </div>
        <Link href="/dashboard/stations/new" className="btn btn-primary">
          New Station
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {stat.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
              <div style={{ fontSize: "32px", fontWeight: "700", color: "var(--text)", letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              {stat.change !== null && (
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: stat.change >= 0 ? "var(--green)" : "var(--red)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>{stat.change >= 0 ? "↑" : "↓"}</span>
                  <span>{Math.abs(stat.change).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "40px" }}>
        <DashboardStats
          thisWeek={thisWeek}
          lastWeek={lastWeek}
          thisWeekTotal={thisWeekTotal}
          lastWeekTotal={lastWeekTotal}
          pctChange={pctChange}
        />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--text)", letterSpacing: "-0.01em" }}>
            Your Stations
          </h2>
          {stations.length > 0 && (
            <Link href="/dashboard/stations" style={{ color: "var(--brand)", fontSize: "14px", fontWeight: "600", textDecoration: "none" }}>
              View All
            </Link>
          )}
        </div>

        {stations.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "60px 40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "var(--bg-elevated)",
                border: "2px dashed var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                color: "var(--text-dim)",
              }}
            >
              ○
            </div>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text)", marginBottom: "8px" }}>
                No stations yet
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "15px", marginBottom: "24px", maxWidth: "400px" }}>
                Create your first radio station to start broadcasting. It only takes a minute to get started.
              </p>
              <Link href="/dashboard/stations/new" className="btn btn-primary">
                Create Your First Station
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
            {stations.map((station) => {
              const streamUrl = getPublicStreamUrl(station.id);
              const statusColors = {
                ACTIVE: { bg: "rgba(16, 185, 129, 0.1)", text: "var(--green)", border: "rgba(16, 185, 129, 0.3)" },
                PAUSED: { bg: "rgba(251, 191, 36, 0.1)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.3)" },
                DRAFT: { bg: "rgba(107, 114, 128, 0.1)", text: "#9ca3af", border: "rgba(107, 114, 128, 0.3)" },
              };
              const statusStyle = statusColors[station.status as keyof typeof statusColors] || statusColors.DRAFT;

              return (
                <div key={station.id} className="card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ height: "6px", background: getStationColor(station.id) }} />

                  <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text)", letterSpacing: "-0.01em" }}>
                          {station.name}
                        </h3>
                        <div
                          style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            border: `1px solid ${statusStyle.border}`,
                          }}
                        >
                          {station.status}
                        </div>
                      </div>
                      {station.genre && (
                        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                          {station.genre}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                          Listeners
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                          {Math.floor(Math.random() * 500)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                          Tracks
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                          {station._count.tracks}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-dim)", textTransform: "uppercase", marginBottom: "4px" }}>
                          Uptime
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "var(--text)" }}>
                          {station.status === "ACTIVE" ? "99%" : "0%"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "8px" }}>
                      <Link
                        href={`/dashboard/stations/${station.id}`}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/stations/${station.id}`}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Public Page
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
