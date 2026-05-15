"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

type PlayerBarProps = {
  stationName: string;
  stationSlug: string;
  streamUrl: string;
  genre?: string | null;
  logoUrl?: string | null;
  stationColor?: string;
  fallbackTracks?: { title: string; artist: string; url: string }[];
};

export function PlayerBar({ stationName, stationSlug, streamUrl, genre, logoUrl, stationColor, fallbackTracks }: PlayerBarProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.8);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.volume = volumeRef.current;
    audioRef.current = audio;

    const onPlaying  = () => { setPlaying(true);  setLoading(false); setError(false); setErrorMsg(""); };
    const onPause    = () => setPlaying(false);
    const onWaiting  = () => setLoading(true);
    const onCanPlay  = () => setLoading(false);
    const onError    = () => {
      setError(true);
      setLoading(false);
      setPlaying(false);
      setErrorMsg("Station is offline. Check back later!");
    };

    audio.addEventListener("playing",  onPlaying);
    audio.addEventListener("pause",    onPause);
    audio.addEventListener("waiting",  onWaiting);
    audio.addEventListener("canplay",  onCanPlay);
    audio.addEventListener("error",    onError);

    return () => {
      audio.removeEventListener("playing",  onPlaying);
      audio.removeEventListener("pause",    onPause);
      audio.removeEventListener("waiting",  onWaiting);
      audio.removeEventListener("canplay",  onCanPlay);
      audio.removeEventListener("error",    onError);
      audio.pause();
      audio.src = "";
    };
  }, []); // intentionally runs once on mount only

  const playFallbackTrack = useCallback((index: number) => {
    const audio = audioRef.current;
    if (!audio || !fallbackTracks || fallbackTracks.length === 0) return false;
    
    const safeIndex = index % fallbackTracks.length;
    const track = fallbackTracks[safeIndex];
    if (!track.url) return false;
    
    setTrackIndex(safeIndex);
    setCurrentTrack(`${track.title} — ${track.artist}`);
    setError(false);
    setErrorMsg("");
    setLoading(true);
    audio.src = track.url;
    audio.play().catch(() => {
      setError(true);
      setLoading(false);
      setErrorMsg("Unable to play track");
    });
    return true;
  }, [fallbackTracks]);

  // Auto-advance to next track when current ends
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => {
      if (fallbackTracks && fallbackTracks.length > 0) {
        playFallbackTrack(trackIndex + 1);
      }
    };
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [trackIndex, fallbackTracks, playFallbackTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      setLoading(true);
      setError(false);
      setErrorMsg("");
      setCurrentTrack(null);

      let fallbackStarted = false;
      const startFallback = () => {
        if (fallbackStarted) return;
        fallbackStarted = true;
        if (fallbackTracks && fallbackTracks.length > 0) {
          playFallbackTrack(trackIndex);
        } else {
          setError(true);
          setLoading(false);
          setPlaying(false);
          setErrorMsg("Station is offline. Check back later!");
        }
      };

      // Browsers may resolve audio.play() before the network stream fails.
      // Listen for the live stream error once so uploaded tracks still play
      // when a public station is active but its Icecast mount is offline.
      audio.addEventListener("error", startFallback, { once: true });
      audio.src = streamUrl;
      audio.play().catch(startFallback);
    }
  }, [playing, streamUrl, fallbackTracks, trackIndex, playFallbackTrack]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    volumeRef.current = v;
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
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
            background: error ? "#ef4444" : "var(--brand)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem", color: "#fff", flexShrink: 0,
            transition: "background 150ms",
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {loading ? "⟳" : error ? "⚠" : playing ? "⏸" : "▶"}
        </button>

        {errorMsg && (
          <span className="player-bar-status" style={{ fontSize: "0.72rem", color: "#f87171", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {errorMsg}
          </span>
        )}

        {!errorMsg && (
          <span className="player-bar-status" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
            {currentTrack || genre || "Live Radio"}
          </span>
        )}
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
