"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type FallbackTrack = {
  title: string;
  artist: string;
  url: string;
};

type PlayerConfig = {
  stationId?: string;
  stationName?: string;
  stationSlug?: string;
  streamUrl: string;
  genre?: string | null;
  logoUrl?: string | null;
  stationColor?: string;
  fallbackTracks?: FallbackTrack[];
};

type PlaybackState = {
  playing: boolean;
  loading: boolean;
  error: boolean;
  errorMsg: string;
  currentTrack: string | null;
  streamMode: "idle" | "live" | "fallback";
  stationId: string | null;
  stationName: string | null;
  stationSlug: string | null;
};

const DEFAULT_VOLUME = 0.8;

declare global {
  interface Window {
    __openradioPlayerConfig?: Partial<PlayerConfig>;
  }
}

function cacheBustStreamUrl(streamUrl: string) {
  // Do not append cache-busting query params to Icecast live streams.
  // Some Icecast/proxy combinations accept them, but browser media stacks can
  // treat each reconnect as a brand-new resource and produce audible hiccups.
  return streamUrl;
}

function normalizeConfig(input: Partial<PlayerConfig>): PlayerConfig | null {
  if (typeof input.streamUrl !== "string" || input.streamUrl.trim().length < 1) {
    return null;
  }

  return {
    streamUrl: input.streamUrl,
    stationId: typeof input.stationId === "string" ? input.stationId : undefined,
    stationName: typeof input.stationName === "string" ? input.stationName : undefined,
    stationSlug: typeof input.stationSlug === "string" ? input.stationSlug : undefined,
    genre: typeof input.genre === "string" ? input.genre : undefined,
    logoUrl: typeof input.logoUrl === "string" ? input.logoUrl : undefined,
    stationColor: typeof input.stationColor === "string" ? input.stationColor : undefined,
    fallbackTracks: Array.isArray(input.fallbackTracks)
      ? input.fallbackTracks
          .filter((track): track is FallbackTrack => {
            return (
              track &&
              typeof track.title === "string" &&
              typeof track.artist === "string" &&
              typeof track.url === "string" &&
              track.url.length > 0
            );
          })
      : undefined,
  };
}

function dispatchPlaybackState(state: PlaybackState) {
  window.dispatchEvent(new CustomEvent("openradio:playback-state", { detail: state }));
}

function dispatchVolumeState(volume: number) {
  window.dispatchEvent(new CustomEvent("openradio:volume-state", { detail: { volume } }));
}

export function PersistentPlayerHost() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const configRef = useRef<PlayerConfig | null>(null);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const fallbackIndexRef = useRef(0);
  const liveStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const playbackStateRef = useRef<PlaybackState>({
    playing: false,
    loading: false,
    error: false,
    errorMsg: "",
    currentTrack: null,
    streamMode: "idle",
    stationId: null,
    stationName: null,
    stationSlug: null,
  });

  const [, setPlaybackState] = useState<PlaybackState>({
    playing: false,
    loading: false,
    error: false,
    errorMsg: "",
    currentTrack: null,
    streamMode: "idle",
    stationId: null,
    stationName: null,
    stationSlug: null,
  });

  const updatePlaybackState = useCallback((updates: Partial<PlaybackState>) => {
    setPlaybackState((prev) => {
      const next = { ...prev, ...updates };
      playbackStateRef.current = next;
      dispatchPlaybackState(next);
      return next;
    });
  }, []);

  const clearLiveStartTimer = useCallback(() => {
    if (liveStartTimerRef.current) {
      clearTimeout(liveStartTimerRef.current);
      liveStartTimerRef.current = null;
    }
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const playFallbackTrack = useCallback(
    (startIndex = 0) => {
      const audio = audioRef.current;
      const config = configRef.current;
      const tracks = config?.fallbackTracks ?? [];

      if (!audio || tracks.length === 0) {
        updatePlaybackState({
          playing: false,
          loading: false,
          error: true,
          errorMsg: "Live stream unavailable and no backup tracks are configured.",
          currentTrack: null,
          streamMode: "idle",
        });
        return false;
      }

      const safeIndex = ((startIndex % tracks.length) + tracks.length) % tracks.length;
      const track = tracks[safeIndex];
      fallbackIndexRef.current = safeIndex;
      audio.src = track.url;
      audio.load();

      updatePlaybackState({
        loading: true,
        error: false,
        errorMsg: "",
        currentTrack: `${track.title} — ${track.artist}`,
        streamMode: "fallback",
      });

      audio
        .play()
        .then(() => {
          updatePlaybackState({
            playing: true,
            loading: false,
            error: false,
            errorMsg: "",
            streamMode: "fallback",
          });
        })
        .catch(() => {
          updatePlaybackState({
            playing: false,
            loading: false,
            error: true,
            errorMsg: "Unable to play fallback track.",
            streamMode: "idle",
          });
        });

      return true;
    },
    [updatePlaybackState],
  );

  const connectLiveStream = useCallback(() => {
    const audio = audioRef.current;
    const config = configRef.current;

    if (!audio || !config?.streamUrl) {
      return;
    }

    clearLiveStartTimer();
    clearReconnectTimer();
    // Stop any current playback first
    audio.pause();

    const nextSrc = cacheBustStreamUrl(config.streamUrl);
    if (audio.src !== nextSrc) {
      audio.src = nextSrc;
      // Load only when the source actually changes. Re-loading an unchanged live
      // stream is what causes avoidable buffer drops in browsers.
      audio.load();
    }

    updatePlaybackState({
      loading: true,
      error: false,
      errorMsg: "",
      currentTrack: null,
      streamMode: "live",
    });

    audio.play().catch(() => {
      updatePlaybackState({
        error: true,
        errorMsg: "Stream unavailable. Check back soon.",
        loading: false,
        playing: false,
        currentTrack: null,
        streamMode: "idle",
      });
    });
  }, [clearLiveStartTimer, clearReconnectTimer, updatePlaybackState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.preload = "auto";

    if (typeof window !== "undefined") {
      const savedVolume = window.localStorage.getItem("openradio:volume");
      if (savedVolume) {
        const parsed = Number(savedVolume);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
          volumeRef.current = parsed;
        }
      }
    }

    audio.volume = volumeRef.current;
    dispatchVolumeState(volumeRef.current);

    const onPlaying = () => {
      clearLiveStartTimer();
      clearReconnectTimer();
      reconnectAttemptsRef.current = 0;
      updatePlaybackState({
        playing: true,
        loading: false,
        error: false,
        errorMsg: "",
      });
    };

    const onPause = () => {
      clearLiveStartTimer();
      updatePlaybackState({
        playing: false,
        loading: false,
      });
    };

    const onWaiting = () => {
      updatePlaybackState({ loading: true });
    };

    const onCanPlay = () => {
      updatePlaybackState({ loading: false });
    };

    const scheduleLiveReconnect = () => {
      if (playbackStateRef.current.streamMode !== "live") {
        return;
      }

      clearReconnectTimer();
      reconnectAttemptsRef.current += 1;
      const delayMs = Math.min(1500 * reconnectAttemptsRef.current, 8000);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connectLiveStream();
      }, delayMs);
    };

    const onError = () => {
      updatePlaybackState({
        error: true,
        errorMsg: "Stream interrupted. Reconnecting...",
        loading: true,
        playing: false,
        currentTrack: null,
        streamMode: "live",
      });
      scheduleLiveReconnect();
    };

    const onStalled = () => {
      // Stalls can recover on their own once the browser has buffered more audio.
      // Reconnecting here would restart the live resource and can itself sound like a hiccup.
      updatePlaybackState({ loading: true });
    };

    const onEnded = () => {
      // Live streams don't end; reconnect if dropped
      scheduleLiveReconnect();
    };

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);
    audio.addEventListener("stalled", onStalled);
    audio.addEventListener("ended", onEnded);

    return () => {
      clearLiveStartTimer();
      clearReconnectTimer();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("stalled", onStalled);
      audio.removeEventListener("ended", onEnded);
    };
  }, [clearLiveStartTimer, clearReconnectTimer, connectLiveStream, updatePlaybackState]);

  useEffect(() => {
    const handleConfigure = (event: Event) => {
      const customEvent = event as CustomEvent<Partial<PlayerConfig>>;
      const nextConfig = normalizeConfig(customEvent.detail ?? {});
      if (!nextConfig) return;

      if (typeof window !== "undefined") {
        window.__openradioPlayerConfig = nextConfig;
      }

      const previous = configRef.current;
      configRef.current = nextConfig;
      fallbackIndexRef.current = 0;

      updatePlaybackState({
        stationId: nextConfig.stationId ?? null,
        stationName: nextConfig.stationName ?? null,
        stationSlug: nextConfig.stationSlug ?? null,
      });

      const changedStream = previous?.streamUrl !== nextConfig.streamUrl;
      if (!changedStream) {
        return;
      }

      const audio = audioRef.current;
      if (!audio) return;

      if (!audio.paused) {
        connectLiveStream();
      } else {
        updatePlaybackState({
          loading: false,
          error: false,
          errorMsg: "",
          currentTrack: null,
          streamMode: "idle",
        });
      }
    };

    const handleTogglePlayback = (event: Event) => {
      const audio = audioRef.current;
      if (!audio) return;

      const customEvent = event as CustomEvent<Partial<PlayerConfig> | undefined>;
      const eventConfig = normalizeConfig(customEvent.detail ?? {});
      const rememberedConfig = typeof window !== "undefined" ? normalizeConfig(window.__openradioPlayerConfig ?? {}) : null;
      const nextConfig = eventConfig ?? rememberedConfig;

      if (nextConfig) {
        configRef.current = nextConfig;
        if (typeof window !== "undefined") {
          window.__openradioPlayerConfig = nextConfig;
        }
        updatePlaybackState({
          stationId: nextConfig.stationId ?? null,
          stationName: nextConfig.stationName ?? null,
          stationSlug: nextConfig.stationSlug ?? null,
        });
      }

      if (audio.paused) {
        connectLiveStream();
      } else {
        audio.pause();
      }
    };

    const handleSetVolume = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      const nextVolumeRaw =
        typeof customEvent.detail === "number"
          ? customEvent.detail
          : typeof (customEvent.detail as { volume?: number } | null)?.volume === "number"
            ? (customEvent.detail as { volume?: number }).volume ?? volumeRef.current
            : volumeRef.current;

      const nextVolume = Math.max(0, Math.min(1, Number(nextVolumeRaw)));
      volumeRef.current = nextVolume;
      const audio = audioRef.current;
      if (audio) {
        audio.volume = nextVolume;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("openradio:volume", String(nextVolume));
      }

      dispatchVolumeState(nextVolume);
    };

    window.addEventListener("openradio:configure-player", handleConfigure as EventListener);
    window.addEventListener("openradio:toggle-playback", handleTogglePlayback);
    window.addEventListener("openradio:set-volume", handleSetVolume as EventListener);

    const rememberedConfig = normalizeConfig(window.__openradioPlayerConfig ?? {});
    if (rememberedConfig) {
      configRef.current = rememberedConfig;
      updatePlaybackState({
        stationId: rememberedConfig.stationId ?? null,
        stationName: rememberedConfig.stationName ?? null,
        stationSlug: rememberedConfig.stationSlug ?? null,
      });
    }

    dispatchPlaybackState(playbackStateRef.current);
    dispatchVolumeState(volumeRef.current);

    return () => {
      window.removeEventListener("openradio:configure-player", handleConfigure as EventListener);
      window.removeEventListener("openradio:toggle-playback", handleTogglePlayback);
      window.removeEventListener("openradio:set-volume", handleSetVolume as EventListener);
    };
  }, [connectLiveStream, updatePlaybackState]);

  return (
    <audio
      ref={audioRef}
      preload="auto"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}
