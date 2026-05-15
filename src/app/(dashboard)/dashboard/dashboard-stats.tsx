"use client";

import { LineChart } from "@/components/line-chart";

type DataPoint = { label: string; value: number };

type Props = {
  thisWeek: DataPoint[];
  lastWeek: DataPoint[];
  thisWeekTotal: number;
  lastWeekTotal: number;
  pctChange: number;
};

export function DashboardStats({ thisWeek, lastWeek, pctChange }: Props) {
  const hasData = thisWeek.some((d) => d.value > 0) || lastWeek.some((d) => d.value > 0);

  const series = [
    { name: "This week", color: "var(--brand)", data: thisWeek },
    { name: "Last week", color: "#94a3b8", data: lastWeek },
  ];

  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1rem", margin: 0 }}>Listener Trend (Last 7 Days)</h2>
        {pctChange !== 0 && (
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: pctChange >= 0 ? "var(--green)" : "#ef4444" }}>
            {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}% vs last week
          </span>
        )}
      </div>

      {hasData ? (
        <LineChart series={series} height={160} yLabel="Daily listeners" />
      ) : (
        <div style={{
          height: 140, borderRadius: "var(--radius-lg)",
          background: "var(--bg-page)", border: "1.5px dashed var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "0.4rem",
        }}>
          <span style={{ fontSize: "1.75rem" }}>📊</span>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Listener data will appear here once Icecast metrics are ingested
          </p>
        </div>
      )}
    </div>
  );
}
