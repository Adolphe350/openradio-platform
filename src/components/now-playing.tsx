"use client";

import { useState, useEffect } from "react";

type Props = {
  mountPath: string; // e.g. /my-station.mp3
};

type NowPlayingData = {
  title: string | null;
  listeners: number;
  live: boolean;
};

export function NowPlaying({ mountPath }: Props) {
  const [data, setData] = useState<NowPlayingData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/now-playing?mount=${encodeURIComponent(mountPath)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = await res.json() as NowPlayingData;
        if (!cancelled) setData(json);
      } catch {
        // silently ignore — Icecast may be unreachable in dev
      }
    }

    poll();
    const interval = setInterval(poll, 15_000); // refresh every 15 s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mountPath]);

  if (!data) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        background: "rgba(0,200,160,0.08)",
        border: "1px solid rgba(0,200,160,0.2)",
        borderRadius: "var(--radius-md)",
        marginBottom: "0.75rem",
      }}
    >
      <span style={{ fontSize: "1.2rem" }}>🎵</span>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--brand)" }}>
          Now Playing
        </p>
        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.title ?? "Live stream"}
        </p>
      </div>
      <div style={{ marginLeft: "auto", flexShrink: 0, display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <span className="live-dot" />
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
          {data.listeners} listening
        </span>
      </div>
    </div>
  );
}
