"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type PlayerBarProps = {
  stationName: string;
  stationSlug: string;
  genre?: string | null;
  logoUrl?: string | null;
  stationColor?: string;
};

export function PlayerBar({ stationName, stationSlug, genre, logoUrl, stationColor }: PlayerBarProps) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const onPlaybackState = (event: Event) => {
      const customEvent = event as CustomEvent<{ playing?: boolean }>;
      setPlaying(Boolean(customEvent.detail?.playing));
    };

    const onVolumeState = (event: Event) => {
      const customEvent = event as CustomEvent<{ volume?: number }>;
      if (typeof customEvent.detail?.volume === "number") {
        setVolume(customEvent.detail.volume);
      }
    };

    window.addEventListener("openradio:playback-state", onPlaybackState as EventListener);
    window.addEventListener("openradio:volume-state", onVolumeState as EventListener);

    return () => {
      window.removeEventListener("openradio:playback-state", onPlaybackState as EventListener);
      window.removeEventListener("openradio:volume-state", onVolumeState as EventListener);
    };
  }, []);

  const togglePlay = useCallback(() => {
    window.dispatchEvent(new CustomEvent("openradio:toggle-playback"));
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    window.dispatchEvent(new CustomEvent("openradio:set-volume", { detail: v }));
  }, []);

  const grad = stationColor ?? "linear-gradient(135deg,#667eea,#764ba2)";

  return (
    <div
      className="player-bar"
      style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        zIndex: 1000,
        background: "var(--bg-dark)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "0 1.25rem",
        height: 68,
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.35)",
      }}
    >
      {/* Logo */}
      <div
        className="player-bar-logo"
        style={{
          width: 42, height: 42, borderRadius: 8, flexShrink: 0,
          background: logoUrl ? undefined : grad,
          overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
        }}
      >
        {logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={logoUrl} alt={stationName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : "📻"}
      </div>

      {/* Controls — centered */}
      <div className="player-bar-main" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
        <Link
          href={`/stations/${stationSlug}`}
          className="player-bar-title"
          style={{ fontWeight: 700, fontSize: "0.875rem", color: "#fff", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {stationName}
        </Link>

        <button
          onClick={togglePlay}
          className="player-bar-play"
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "var(--brand)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem", color: "#fff", flexShrink: 0,
            transition: "background 150ms",
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>

        <span className="player-bar-status" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
          {genre || "Live Radio"}
        </span>
      </div>

      {/* Volume */}
      <div className="player-bar-volume" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
          {volume === 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊"}
        </span>
        <input
          type="range" min={0} max={1} step={0.05}
          value={volume}
          onChange={handleVolume}
          style={{ width: 80, accentColor: "var(--brand)", cursor: "pointer" }}
          aria-label="Volume"
        />
      </div>

      {/* Open link */}
      <Link
        href={`/stations/${stationSlug}`}
        className="player-bar-open"
        style={{ fontSize: "0.78rem", color: "var(--brand)", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}
      >
        Open →
      </Link>

      {/* Live dot */}
      <div className="player-bar-live" style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
        <span className="live-dot" />
        <span style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.5)" }}>
          Live
        </span>
      </div>
    </div>
  );
}
