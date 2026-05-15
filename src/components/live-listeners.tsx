"use client";

import { useEffect, useRef, useState } from "react";

type HistoryPoint = { t: string; v: number };

type Props = {
  stationId: string;
  initialCount?: number;
};

export function LiveListeners({ stationId, initialCount = 0 }: Props) {
  const [count, setCount] = useState(initialCount);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/stations/${stationId}/listeners`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { listeners: number; history?: HistoryPoint[] };
        setCount(data.listeners);
        if (data.history) {
          setHistory(data.history);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      es.close();
    };
  }, [stationId]);

  // Simple SVG sparkline
  const sparkline = (() => {
    if (history.length < 2) return null;
    const vals = history.map((p) => p.v);
    const max = Math.max(...vals, 1);
    const w = 200;
    const h = 40;
    const step = w / (vals.length - 1);
    const points = vals
      .map((v, i) => `${i * step},${h - (v / max) * h}`)
      .join(" ");
    return (
      <svg width={w} height={h} style={{ display: "block" }} aria-label="Listener history chart">
        <polyline
          points={points}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span className="live-dot" style={{ width: 8, height: 8, background: count > 0 ? "#22c55e" : "var(--text-muted)", borderRadius: "50%", display: "inline-block" }} />
        <span style={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1 }}>{count}</span>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>live listeners</span>
      </div>
      {sparkline && (
        <div style={{ opacity: 0.8 }}>
          {sparkline}
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>Last 24h</p>
        </div>
      )}
    </div>
  );
}
