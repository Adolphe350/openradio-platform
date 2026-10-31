"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";

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

  const playerConfig = useMemo(
    () => ({
      stationId,
      stationName,
      stationSlug,
      streamUrl,
      genre,
      logoUrl,
      stationColor,
      fallbackTracks: normalizedFallback,
    }),
    [stationId, stationName, stationSlug, streamUrl, genre, logoUrl, stationColor, normalizedFallback],
  );

  useEffect(() => {
    window.__openradioPlayerConfig = playerConfig;
    window.dispatchEvent(new CustomEvent("openradio:configure-player", { detail: playerConfig }));
  }, [playerConfig]);

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
    window.dispatchEvent(new CustomEvent("openradio:configure-player", { detail: playerConfig }));
    window.dispatchEvent(new CustomEvent("openradio:toggle-playback", { detail: playerConfig }));
  }, [playerConfig]);

  const handleVolume = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(0, Math.min(1, Number(event.target.value)));
    setVolume(next);
    window.dispatchEvent(new CustomEvent("openradio:set-volume", { detail: next }));
  }, []);

  const subtitle =
    errorMsg ||
    currentTrack ||
    (playing ? "Live broadcast is playing" : "Press play to start the live stream");

  const label = loading
    ? "Connecting"
    : error
      ? "Stream unavailable"
      : playing
        ? "Playing live"
        : "Ready";

  return (
    <div className="station-player">
      <div className="station-player-row">
        <button
          type="button"
          onClick={togglePlay}
          className={`play-btn${error ? " is-error" : ""}`}
          aria-label={playing ? `Pause ${stationName}` : `Play ${stationName}`}
          aria-pressed={playing}
        >
          {loading ? (
            <Icon name="spinner" size={24} className="spin" />
          ) : error ? (
            <Icon name="alert" size={22} />
          ) : playing ? (
            <Icon name="pause" size={22} />
          ) : (
            <Icon name="play" size={24} />
          )}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="player-state" aria-live="polite">
            <span className={`mini-lamp lamp-${playing ? "on" : "off"}`} aria-hidden="true" />
            {label}
          </p>
          <p className="player-title">{subtitle}</p>
        </div>

        {playing ? (
          <div className="eq" data-live="true" aria-hidden="true" style={{ width: 56, height: 28 }}>
            {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 5) * 0.12}s` }} />)}
          </div>
        ) : null}
      </div>

      <div className="volume-row">
        <button
          type="button"
          className="icon-toggle"
          onClick={() => {
            const next = volume === 0 ? 0.8 : 0;
            setVolume(next);
            window.dispatchEvent(new CustomEvent("openradio:set-volume", { detail: next }));
          }}
          aria-label={volume === 0 ? "Unmute" : "Mute"}
        >
          <Icon name={volume === 0 ? "mute" : "volume"} size={18} />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
          aria-label="Player volume"
        />
        <span className="mono">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}
