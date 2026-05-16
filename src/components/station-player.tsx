"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FallbackTrack = {
  title: string;
  artist: string;
  url: string;
};

type StationPlayerProps = {
  stationId: string;
  stationName: string;
  stationSlug: string;
  streamUrl: string;
  genre?: string | null;
  logoUrl?: string | null;
  stationColor?: string;
  fallbackTracks?: FallbackTrack[];
};

type PlaybackState = {
  playing?: boolean;
  loading?: boolean;
  error?: boolean;
  errorMsg?: string;
  currentTrack?: string | null;
  streamMode?: "idle" | "live" | "fallback";
  stationId?: string | null;
};

export function StationPlayer({
  stationId,
  stationName,
  stationSlug,
  streamUrl,
  genre,
  logoUrl,
  stationColor,
  fallbackTracks,
}: StationPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);

  const normalizedFallback = useMemo(() => {
    return (fallbackTracks ?? []).filter((track) => track?.url);
  }, [fallbackTracks]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("openradio:configure-player", {
        detail: {
          stationId,
          stationName,
          stationSlug,
          streamUrl,
          genre,
          logoUrl,
          stationColor,
          fallbackTracks: normalizedFallback,
        },
      }),
    );
  }, [stationId, stationName, stationSlug, streamUrl, genre, logoUrl, stationColor, normalizedFallback]);

  useEffect(() => {
    const onPlaybackState = (event: Event) => {
      const customEvent = event as CustomEvent<PlaybackState>;
      const detail = customEvent.detail ?? {};

      if (detail.stationId && detail.stationId !== stationId) {
        return;
      }

      setPlaying(Boolean(detail.playing));
      setLoading(Boolean(detail.loading));
      setError(Boolean(detail.error));
      setErrorMsg(typeof detail.errorMsg === "string" ? detail.errorMsg : "");
      setCurrentTrack(typeof detail.currentTrack === "string" ? detail.currentTrack : null);
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
  }, [stationId]);

  const togglePlay = useCallback(() => {
    window.dispatchEvent(new CustomEvent("openradio:toggle-playback"));
  }, []);

  const handleVolume = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(0, Math.min(1, Number(event.target.value)));
    setVolume(next);
    window.dispatchEvent(new CustomEvent("openradio:set-volume", { detail: next }));
  }, []);

  const subtitle =
    errorMsg ||
    (playing ? "Auto DJ is playing" : "Tap play to start the live stream");

  const label = loading
    ? "Connecting..."
    : playing
      ? "Live stream"
      : "Ready";

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={togglePlay}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: error ? "#ef4444" : "var(--brand)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "1.25rem",
            flexShrink: 0,
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {loading ? "⟳" : error ? "⚠" : playing ? "⏸" : "▶"}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.74rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {label}
          </p>
          <p
            style={{
              margin: "0.2rem 0 0",
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#fff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.7rem",
          padding: "0.45rem 0.65rem",
          borderRadius: 8,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
          {volume === 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊"}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
          style={{ width: "100%", accentColor: "var(--brand)" }}
          aria-label="Player volume"
        />
        <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.55)", minWidth: 32, textAlign: "right" }}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
