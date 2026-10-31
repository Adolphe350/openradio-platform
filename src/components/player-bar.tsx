"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";

type PlayerBarProps = {
  stationName: string;
  stationSlug: string;
  genre?: string | null;
  logoUrl?: string | null;
  stationColor?: string;
};

type PlaybackState = {
  stationSlug?: string | null;
  playing?: boolean;
  loading?: boolean;
  error?: boolean;
  errorMsg?: string;
  currentTrack?: string | null;
};

export function PlayerBar({ stationName, stationSlug, genre, logoUrl, stationColor }: PlayerBarProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);

  useEffect(() => {
    const onPlaybackState = (event: Event) => {
      const customEvent = event as CustomEvent<PlaybackState>;
      const detail = customEvent.detail ?? {};

      if (detail.stationSlug && detail.stationSlug !== stationSlug) {
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
  }, [stationSlug]);

  const togglePlay = useCallback(() => {
    window.dispatchEvent(new CustomEvent("openradio:toggle-playback"));
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.max(0, Math.min(1, Number(e.target.value)));
    setVolume(v);
    window.dispatchEvent(new CustomEvent("openradio:set-volume", { detail: v }));
  }, []);

  const statusText = useMemo(() => {
    if (error && errorMsg) return errorMsg;
    if (currentTrack) return currentTrack;
    if (loading) return "Connecting...";
    if (playing) return genre || "Live stream";
    return "Ready";
  }, [currentTrack, error, errorMsg, genre, loading, playing]);

  void stationColor;

  return (
    <div className="player-bar" role="region" aria-label="Player">
      <span className="station-art" aria-hidden="true">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" />
        ) : (
          stationName.charAt(0).toUpperCase()
        )}
      </span>

      <div className="player-bar-main">
        <button
          type="button"
          onClick={togglePlay}
          className={`play-btn play-btn-sm${error ? " is-error" : ""}`}
          aria-label={playing ? `Pause ${stationName}` : `Play ${stationName}`}
          aria-pressed={playing}
        >
          {loading ? (
            <Icon name="spinner" size={20} className="spin" />
          ) : error ? (
            <Icon name="alert" size={18} />
          ) : playing ? (
            <Icon name="pause" size={18} />
          ) : (
            <Icon name="play" size={20} />
          )}
        </button>
        <div className="player-bar-text">
          <Link href={`/stations/${stationSlug}`} className="player-bar-title">
            {stationName}
          </Link>
          <span className="player-bar-status">{statusText}</span>
        </div>
      </div>

      <div className="player-bar-volume">
        <Icon name={volume === 0 ? "mute" : "volume"} size={18} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
          aria-label="Volume"
        />
      </div>

      <span className={`onair-pill onair-compact ${playing ? "onair-on" : "onair-off"}`}>
        <span className="onair-lamp" aria-hidden="true" />
        <span className="onair-text">{playing ? "LIVE" : "IDLE"}</span>
      </span>
    </div>
  );
}
