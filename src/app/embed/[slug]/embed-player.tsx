"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";

type Props = {
  stationId: string;
  stationName: string;
  stationSlug: string;
  streamUrl: string;
  genre?: string | null;
  logoUrl?: string | null;
};

/** Compact player for the 320×120 embed iframe. Drives the shared
 *  persistent audio host through the same window events as the station page. */
export function EmbedPlayer({ stationId, stationName, stationSlug, streamUrl, genre, logoUrl }: Props) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [track, setTrack] = useState<string | null>(null);

  const config = useMemo(
    () => ({ stationId, stationName, stationSlug, streamUrl, genre, logoUrl, fallbackTracks: [] }),
    [stationId, stationName, stationSlug, streamUrl, genre, logoUrl],
  );

  useEffect(() => {
    window.__openradioPlayerConfig = config;
    window.dispatchEvent(new CustomEvent("openradio:configure-player", { detail: config }));
  }, [config]);

  useEffect(() => {
    const onState = (event: Event) => {
      const d = (event as CustomEvent<{ stationId?: string | null; playing?: boolean; loading?: boolean; error?: boolean; currentTrack?: string | null }>).detail ?? {};
      if (d.stationId && d.stationId !== stationId) return;
      setPlaying(Boolean(d.playing));
      setLoading(Boolean(d.loading));
      setError(Boolean(d.error));
      setTrack(typeof d.currentTrack === "string" ? d.currentTrack : null);
    };
    window.addEventListener("openradio:playback-state", onState as EventListener);
    return () => window.removeEventListener("openradio:playback-state", onState as EventListener);
  }, [stationId]);

  const toggle = () => {
    window.dispatchEvent(new CustomEvent("openradio:configure-player", { detail: config }));
    window.dispatchEvent(new CustomEvent("openradio:toggle-playback", { detail: config }));
  };

  return (
    <div className="embed-player">
      <div className="embed-row">
        <span className="station-art" aria-hidden="true">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" />
          ) : (
            stationName.charAt(0).toUpperCase()
          )}
        </span>
        <div className="embed-meta">
          <strong>{stationName}</strong>
          <span>{error ? "Stream unavailable" : loading ? "Connecting…" : track ?? genre ?? "Live radio"}</span>
        </div>
        <button
          type="button"
          className={`play-btn play-btn-sm${error ? " is-error" : ""}`}
          onClick={toggle}
          aria-label={playing ? `Pause ${stationName}` : `Play ${stationName}`}
          aria-pressed={playing}
        >
          {loading ? <Icon name="spinner" size={20} className="spin" /> : playing ? <Icon name="pause" size={18} /> : <Icon name="play" size={20} />}
        </button>
      </div>
      <div className="embed-foot">
        <span className="mono">
          <span className={`mini-lamp lamp-${playing ? "on" : "off"}`} aria-hidden="true" />
          {playing ? "On air" : "Live radio"}
        </span>
        <a href={`/stations/${stationSlug}`} target="_blank" rel="noreferrer">
          Open station
        </a>
      </div>
    </div>
  );
}
