"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

import { LineChart, type Series } from "@/components/line-chart";

type DayPoint = { date: string; value: number };
type StationGroup = { name: string; listeners: number; peak: number; dataPoints: { date: string; value: number }[] };
type AnalyticsResponse =
  | { groupBy: "day"; from: string; to: string; current: DayPoint[]; previous: DayPoint[]; summary: { thisTotal: number; prevTotal: number; pctChange: number } }
  | { groupBy: "station"; stations: StationGroup[] };

function toShortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatNum(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function AnalyticsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(sevenDaysAgo);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState<"day" | "station">("day");
  const [showCompare, setShowCompare] = useState(true);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, groupBy });
      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  useEffect(() => { load(); }, [load]);

  const setPreset = (days: number) => {
    const t = new Date().toISOString().slice(0, 10);
    const f = new Date(Date.now() - (days - 1) * 24 * 3600 * 1000).toISOString().slice(0, 10);
    setFrom(f);
    setTo(t);
  };

  let series: Series[] = [];
  let summary: { thisTotal: number; prevTotal: number; pctChange: number } | null = null;

  if (data?.groupBy === "day") {
    const curr: Series = {
      name: "This period",
      color: "var(--brand)",
      data: data.current.map((d) => ({ label: toShortDate(d.date), value: d.value })),
    };
    series = [curr];
    if (showCompare) {
      series.push({
        name: "Previous period",
        color: "#94a3b8",
        data: data.previous.map((d) => ({ label: toShortDate(d.date), value: d.value })),
      });
    }
    summary = data.summary;
  } else if (data?.groupBy === "station") {
    series = data.stations.map((s, i) => ({
      name: s.name,
      color: `hsl(${(i * 67) % 360},60%,50%)`,
      data: s.dataPoints.map((d) => ({ label: toShortDate(d.date), value: d.value })),
    }));
  }

  const pctUp = summary && summary.pctChange >= 0;

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Analytics</h1>
          <p className="dash-page-sub">Listener history, trends, and station breakdown.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {/* Controls */}
      <div className="card" style={{ padding: "1rem 1.25rem" }}>
        <div className="mobile-control-row" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Quick presets */}
          <div className="mobile-segment-row" style={{ display: "flex", gap: "0.3rem" }}>
            {[
              { label: "7d", days: 7 },
              { label: "14d", days: 14 },
              { label: "30d", days: 30 },
            ].map((p) => (
              <button
                key={p.label}
                className="btn btn-secondary btn-sm"
                onClick={() => setPreset(p.days)}
                style={{ padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="mobile-date-row" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              style={{ borderRadius: 8, border: "1px solid var(--border)", padding: "0.35rem 0.6rem", fontSize: "0.85rem" }} />
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              style={{ borderRadius: 8, border: "1px solid var(--border)", padding: "0.35rem 0.6rem", fontSize: "0.85rem" }} />
          </div>

          {/* Group by station toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={groupBy === "station"}
              onChange={(e) => setGroupBy(e.target.checked ? "station" : "day")}
            />
            Group by station
          </label>

          {/* Compare toggle */}
          {groupBy === "day" && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer", userSelect: "none" }}>
              <input
                type="checkbox"
                checked={showCompare}
                onChange={(e) => setShowCompare(e.target.checked)}
              />
              Compare to previous period
            </label>
          )}

          <button className="btn btn-primary btn-sm" onClick={load} style={{ marginLeft: "auto" }}>
            {loading ? "Loading…" : "Get Analytics"}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="mobile-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
          <div className="stat-card">
            <div className="stat-value">{formatNum(summary.thisTotal)}</div>
            <div className="stat-label">This Period</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatNum(summary.prevTotal)}</div>
            <div className="stat-label">Previous Period</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: pctUp ? "var(--green)" : "#ef4444" }}>
              {pctUp ? "+" : ""}{summary.pctChange.toFixed(1)}%
            </div>
            <div className="stat-label">Change</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>
          {groupBy === "station" ? "Listeners by Station" : "Listener History"}
        </h2>

        {loading ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading chart…</p>
          </div>
        ) : series.length === 0 || series.every((s) => s.data.every((d) => d.value === 0)) ? (
          <div style={{
            height: 200, borderRadius: "var(--radius-lg)",
            background: "var(--bg-page)", border: "1.5px dashed var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "0.5rem",
          }}>
            <span style={{ fontSize: "2rem" }}>📊</span>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
              No listener data for this period. Data populates as Icecast metrics are ingested.
            </p>
          </div>
        ) : (
          <LineChart series={series} height={220} yLabel="Listeners" />
        )}
      </div>

      {/* Station table when groupBy=station */}
      {data?.groupBy === "station" && data.stations.length > 0 && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>Per-station breakdown</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Station</th>
                  <th style={{ textAlign: "right" }}>Total Listeners</th>
                  <th style={{ textAlign: "right" }}>Peak</th>
                </tr>
              </thead>
              <tbody>
                {data.stations.map((s) => (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ textAlign: "right" }}>{formatNum(s.listeners)}</td>
                    <td style={{ textAlign: "right" }}>{formatNum(s.peak)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
