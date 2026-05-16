"use client";

import { LineChart } from "@/components/line-chart";

interface DataPoint {
  label: string;
  value: number;
}

interface DashboardStatsProps {
  thisWeek: DataPoint[];
  lastWeek: DataPoint[];
  thisWeekTotal: number;
  lastWeekTotal: number;
  pctChange: number;
}

export function DashboardStats({
  thisWeek,
  lastWeek,
  thisWeekTotal,
  lastWeekTotal,
  pctChange,
}: DashboardStatsProps) {
  const hasData = thisWeek.length > 0 && thisWeek.some((d) => d.value > 0);

  return (
    <div className="card" style={{ padding: "28px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "700",
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          Listener Trend
        </h3>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "600",
            background: pctChange >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: pctChange >= 0 ? "var(--green)" : "var(--red)",
            border: `1px solid ${pctChange >= 0 ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>{pctChange >= 0 ? "↑" : "↓"}</span>
          <span>{Math.abs(pctChange).toFixed(1)}% vs last week</span>
        </div>
      </div>

      {hasData ? (
        <div style={{ height: "300px" }}>
          <LineChart
            series={[
              { name: "Last week", color: "#5a5a6e", data: lastWeek },
              { name: "This week", color: "#00c8a0", data: thisWeek },
            ]}
            height={260}
            yLabel="Listeners"
          />
        </div>
      ) : (
        <div
          style={{
            height: "300px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              textAlign: "center",
              maxWidth: "320px",
            }}
          >
            <div
              style={{
                width: "120px",
                height: "120px",
                margin: "0 auto 20px",
                border: "3px dashed var(--border)",
                borderRadius: "var(--radius-lg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <svg
                width="60"
                height="60"
                viewBox="0 0 60 60"
                fill="none"
                style={{ color: "var(--text-dim)" }}
              >
                <path
                  d="M5 30 L15 20 L25 35 L35 25 L45 30 L55 20"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="5,5"
                />
              </svg>
            </div>
            <h4
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "var(--text)",
                marginBottom: "8px",
              }}
            >
              No listener data yet
            </h4>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                lineHeight: "1.5",
              }}
            >
              Once your stations start getting listeners, analytics will appear here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
