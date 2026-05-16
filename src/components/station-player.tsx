"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StationPlayerProps = {
  streamUrl: string;
  fallbackTracks?: { title: string; artist: string; url: string }[];
};

export function StationPlayer({ streamUrl, fallbackTracks }: StationPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.8);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);

  const playFallbackTrack = useCallback((index: number) => {
    const audio = audioRef.current;
    if (!audio || !fallbackTracks || fallbackTracks.length === 0) return false;

    const safeIndex = index % fallbackTracks.length;
    const track = fallbackTracks[safeIndex];
    if (!track?.url) return false;

    setTrackIndex(safeIndex);
    setCurrentTrack(`${track.title} — ${track.artist}`);
    setError(false);
    setErrorMsg("");
    setLoading(true);
    audio.src = track.url;
    audio.load();
    audio.play().catch(() => {
      setError(true);
      setLoading(false);
      setPlaying(false);
      setErrorMsg("Unable to play track");
    });
    return true;
  }, [fallbackTracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let liveStartTimer: ReturnType<typeof setTimeout> | null = null;
    let fallbackStarted = false;

    const clearLiveStartTimer = () => {
      if (liveStartTimer) {
        clearTimeout(liveStartTimer);
        liveStartTimer = null;
      }
    };

    const startFallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      clearLiveStartTimer();

      if (fallbackTracks && fallbackTracks.length > 0) {
        playFallbackTrack(trackIndex);
      } else {
        setError(true);
        setLoading(false);
        setPlaying(false);
        setErrorMsg("Station is offline. Check back later!");
        broadcastPlaybackState(false);
      }
    };

    const broadcastPlaybackState = (isPlaying: boolean) => {
      window.dispatchEvent(new CustomEvent("openradio:playback-state", { detail: { playing: isPlaying } }));
    };

    const onPlaying = () => {
      clearLiveStartTimer();
      setPlaying(true);
      setLoading(false);
      setError(false);
      setErrorMsg("");
      broadcastPlaybackState(true);
    };

    const onPause = () => {
      clearLiveStartTimer();
      setPlaying(false);
      setLoading(false);
      broadcastPlaybackState(false);
    };

    const onWaiting = () => {
      setLoading(true);
    };

    const onCanPlay = () => {
      setLoading(false);
    };

    const onError = () => {
      if (audio.src.includes("/api/audio/")) {
        setError(true);
        setLoading(false);
        setPlaying(false);
        setErrorMsg("Unable to play track");
        return;
      }
      startFallback();
    };

    const onEnded = () => {
      if (fallbackTracks && fallbackTracks.length > 0) {
        playFallbackTrack(trackIndex + 1);
      }
    };

    audio.volume = volumeRef.current;
    audio.preload = "auto";
    window.dispatchEvent(new CustomEvent("openradio:volume-state", { detail: { volume: volumeRef.current } }));
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);

    const connectLiveStream = () => {
      fallbackStarted = false;
      setCurrentTrack(null);
      setError(false);
      setErrorMsg("");
      setLoading(true);
      audio.src = streamUrl;
      audio.load();
      liveStartTimer = setTimeout(() => {
        if (!audio.paused && !audio.currentTime) {
          startFallback();
        }
      }, 6000);
      audio.play().catch(startFallback);
    };

    const handleExternalToggle = () => {
      if (audio.paused) {
        connectLiveStream();
      } else {
        clearLiveStartTimer();
        audio.pause();
      }
    };

    const handleExternalSetVolume = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      const nextVolume = typeof customEvent.detail === "number" ? customEvent.detail : volumeRef.current;
      volumeRef.current = nextVolume;
      audio.volume = nextVolume;
      window.dispatchEvent(new CustomEvent("openradio:volume-state", { detail: { volume: nextVolume } }));
    };

    window.addEventListener("openradio:toggle-playback", handleExternalToggle);
    window.addEventListener("openradio:set-volume", handleExternalSetVolume as EventListener);

    return () => {
      clearLiveStartTimer();
      window.removeEventListener("openradio:toggle-playback", handleExternalToggle);
      window.removeEventListener("openradio:set-volume", handleExternalSetVolume as EventListener);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      broadcastPlaybackState(false);
      audio.pause();
      audio.src = "";
    };
  }, [streamUrl, fallbackTracks, playFallbackTrack, trackIndex]);

  const togglePlay = useCallback(() => {
    window.dispatchEvent(new CustomEvent("openradio:toggle-playback"));
  }, []);

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
          <p style={{ margin: 0, fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.55)" }}>
            {loading ? "Connecting…" : playing ? (currentTrack ? "Playing track" : "Live stream") : "Ready to play"}
          </p>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.95rem", fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {errorMsg || currentTrack || "Tap play to listen now"}
          </p>
        </div>
      </div>

      <audio
        ref={audioRef}
        preload="auto"
        style={{ width: "100%", minWidth: 0, height: 48, borderRadius: 8, accentColor: "var(--brand)" }}
      />
    </div>
  );
}
