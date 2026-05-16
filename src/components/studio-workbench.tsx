"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type StudioTrack = {
  id: string;
  title: string;
  artist: string;
  durationSec: number | null;
  previewUrl: string;
  hasAudio: boolean;
};

type StudioStation = {
  id: string;
  name: string;
  slug: string;
  status: string;
  tracks: StudioTrack[];
};

type StoredStudioClip = {
  id: string;
  stationId: string;
  stationName: string;
  mode: "offline" | "live";
  intent: "draft" | "podcast";
  label: string;
  createdAt: string;
  durationSec: number;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
};

type StudioClip = StoredStudioClip & {
  objectUrl: string;
};

type Props = {
  stations: StudioStation[];
  initialStationId: string;
};

const DB_NAME = "openradio-studio";
const DB_VERSION = 1;
const DB_STORE = "clips";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function buildClipObjectUrl(clip: StoredStudioClip): StudioClip {
  return {
    ...clip,
    objectUrl: URL.createObjectURL(clip.blob),
  };
}

function revokeClipUrls(clips: StudioClip[]) {
  for (const clip of clips) {
    URL.revokeObjectURL(clip.objectUrl);
  }
}

function openStudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function listStoredClips(): Promise<StoredStudioClip[]> {
  const db = await openStudioDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readonly");
    const store = transaction.objectStore(DB_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error ?? new Error("Failed to list studio clips"));
    request.onsuccess = () => {
      const result = (request.result as StoredStudioClip[]).sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      resolve(result);
    };

    transaction.oncomplete = () => db.close();
  });
}

async function saveStoredClip(clip: StoredStudioClip) {
  const db = await openStudioDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);
    const request = store.put(clip);

    request.onerror = () => reject(request.error ?? new Error("Failed to save studio clip"));
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

async function deleteStoredClip(clipId: string) {
  const db = await openStudioDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite");
    const store = transaction.objectStore(DB_STORE);
    const request = store.delete(clipId);

    request.onerror = () => reject(request.error ?? new Error("Failed to delete studio clip"));
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

export function StudioWorkbench({ stations, initialStationId }: Props) {
  const [stationId, setStationId] = useState(initialStationId);
  const [recordMode, setRecordMode] = useState<"offline" | "live">("offline");
  const [recordIntent, setRecordIntent] = useState<"draft" | "podcast">("draft");
  const [label, setLabel] = useState("Episode Draft");
  const [musicTrackId, setMusicTrackId] = useState<string>("");
  const [studioReady, setStudioReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [clips, setClips] = useState<StudioClip[]>([]);
  const [dbAvailable, setDbAvailable] = useState(true);
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [duckingEnabled, setDuckingEnabled] = useState(true);
  const [micVolume, setMicVolume] = useState(1);
  const [musicVolume, setMusicVolume] = useState(0.42);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [status, setStatus] = useState<{ tone: "info" | "success" | "error"; text: string } | null>({
    tone: "info",
    text: "Initialize Studio to access microphone and build your local recording mix.",
  });

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordStartedAtRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clipsRef = useRef<StudioClip[]>([]);

  const micGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const mixGainRef = useRef<GainNode | null>(null);
  const mixDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const monitorConnectedRef = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const duckingRafRef = useRef<number | null>(null);

  const currentStation = useMemo(() => {
    return stations.find((station) => station.id === stationId) ?? stations[0];
  }, [stationId, stations]);

  const playableTracks = useMemo(() => {
    return currentStation.tracks.filter((track) => track.hasAudio);
  }, [currentStation]);

  const selectedMusicTrack = useMemo(() => {
    return playableTracks.find((track) => track.id === musicTrackId) ?? null;
  }, [musicTrackId, playableTracks]);

  const syncMonitorConnection = useCallback(() => {
    const context = audioContextRef.current;
    const mixGain = mixGainRef.current;
    if (!context || !mixGain) return;

    if (monitorEnabled && !monitorConnectedRef.current) {
      mixGain.connect(context.destination);
      monitorConnectedRef.current = true;
    } else if (!monitorEnabled && monitorConnectedRef.current) {
      mixGain.disconnect(context.destination);
      monitorConnectedRef.current = false;
    }
  }, [monitorEnabled]);

  const stopDuckingLoop = useCallback(() => {
    if (duckingRafRef.current) {
      cancelAnimationFrame(duckingRafRef.current);
      duckingRafRef.current = null;
    }
  }, []);

  const startDuckingLoop = useCallback(() => {
    stopDuckingLoop();

    const analyser = analyserRef.current;
    const context = audioContextRef.current;
    const musicGain = musicGainRef.current;

    if (!analyser || !context || !musicGain) return;

    const data = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current || !audioContextRef.current || !musicGainRef.current) {
        return;
      }

      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i += 1) {
        const value = (data[i] - 128) / 128;
        sumSquares += value * value;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      const targetMusic = duckingEnabled && rms > 0.055 ? musicVolume * 0.35 : musicVolume;
      musicGain.gain.setTargetAtTime(targetMusic, context.currentTime, 0.07);

      duckingRafRef.current = requestAnimationFrame(tick);
    };

    duckingRafRef.current = requestAnimationFrame(tick);
  }, [duckingEnabled, musicVolume, stopDuckingLoop]);

  const stopRecordingTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startRecordingTimer = useCallback(() => {
    stopRecordingTimer();
    timerIntervalRef.current = setInterval(() => {
      if (!recordStartedAtRef.current) return;
      const elapsed = Math.max(0, Math.round((Date.now() - recordStartedAtRef.current) / 1000));
      setRecordingSeconds(elapsed);
    }, 250);
  }, [stopRecordingTimer]);

  const initializeStudio = useCallback(async () => {
    if (studioReady) {
      setStatus({ tone: "info", text: "Studio session already initialized." });
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus({ tone: "error", text: "Microphone APIs are unavailable in this browser." });
      return;
    }

    try {
      const context = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const micSource = context.createMediaStreamSource(stream);
      const micGain = context.createGain();
      const musicGain = context.createGain();
      const mixGain = context.createGain();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      const destination = context.createMediaStreamDestination();

      micGain.gain.value = micVolume;
      musicGain.gain.value = musicVolume;

      micSource.connect(micGain);
      micGain.connect(analyser);
      analyser.connect(mixGain);

      const musicElement = audioElementRef.current;
      if (musicElement) {
        const musicSource = context.createMediaElementSource(musicElement);
        musicSource.connect(musicGain);
      }
      musicGain.connect(mixGain);
      mixGain.connect(destination);

      audioContextRef.current = context;
      micStreamRef.current = stream;
      micGainRef.current = micGain;
      musicGainRef.current = musicGain;
      mixGainRef.current = mixGain;
      mixDestinationRef.current = destination;
      analyserRef.current = analyser;

      setStudioReady(true);
      setStatus({ tone: "success", text: "Studio ready. You can monitor, play music beds, and record." });

      syncMonitorConnection();
      startDuckingLoop();
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to initialize studio.",
      });
    }
  }, [micVolume, musicVolume, startDuckingLoop, studioReady, syncMonitorConnection]);

  const teardownStudio = useCallback(async () => {
    stopRecordingTimer();
    stopDuckingLoop();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    const stream = micStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    monitorConnectedRef.current = false;
    mixDestinationRef.current = null;
    mixGainRef.current = null;
    micGainRef.current = null;
    musicGainRef.current = null;
    analyserRef.current = null;
  }, [stopDuckingLoop, stopRecordingTimer]);

  const stopLiveBackendRecording = useCallback(async () => {
    try {
      await fetch(`/api/stations/${stationId}/recordings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
    } catch {
      // local capture remains source-of-truth for this pass
    }
  }, [stationId]);

  const startRecording = useCallback(async () => {
    if (!studioReady || !mixDestinationRef.current) {
      setStatus({ tone: "error", text: "Initialize Studio before recording." });
      return;
    }

    if (recording) return;

    if (recordMode === "live") {
      try {
        const response = await fetch(`/api/stations/${stationId}/recordings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
        if (!response.ok && response.status !== 409) {
          setStatus({ tone: "info", text: "Live mode metadata endpoint is unavailable; continuing with local capture." });
        }
      } catch {
        setStatus({ tone: "info", text: "Live mode metadata endpoint is unavailable; continuing with local capture." });
      }
    }

    try {
      const stream = mixDestinationRef.current.stream;
      const preferredMime =
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
      const recorder = new MediaRecorder(stream, preferredMime ? { mimeType: preferredMime } : undefined);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stopRecordingTimer();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const durationSec = recordStartedAtRef.current
          ? Math.max(1, Math.round((Date.now() - recordStartedAtRef.current) / 1000))
          : 1;

        const clip: StoredStudioClip = {
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          stationId: currentStation.id,
          stationName: currentStation.name,
          mode: recordMode,
          intent: recordIntent,
          label: label.trim() || (recordIntent === "podcast" ? "Podcast Draft" : "Studio Draft"),
          createdAt: new Date().toISOString(),
          durationSec,
          mimeType: blob.type || "audio/webm",
          sizeBytes: blob.size,
          blob,
        };

        if (recordMode === "live") {
          await stopLiveBackendRecording();
        }

        try {
          await saveStoredClip(clip);
          const preview = buildClipObjectUrl(clip);
          setClips((previous) => [preview, ...previous]);
          setStatus({ tone: "success", text: "Recording saved locally. Use Download to export your file." });
        } catch {
          const preview = buildClipObjectUrl(clip);
          setDbAvailable(false);
          setClips((previous) => [preview, ...previous]);
          setStatus({ tone: "info", text: "Recording captured in memory. IndexedDB unavailable for persistent save." });
        }

        setRecording(false);
        setRecordingSeconds(0);
      };

      mediaRecorderRef.current = recorder;
      recordStartedAtRef.current = Date.now();
      setRecordingSeconds(0);
      recorder.start(300);
      startRecordingTimer();
      setRecording(true);
      setStatus({ tone: "info", text: "Recording in progress..." });
    } catch (error) {
      setStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to start recording.",
      });
    }
  }, [
    currentStation.id,
    currentStation.name,
    label,
    recordIntent,
    recordMode,
    recording,
    startRecordingTimer,
    stationId,
    stopLiveBackendRecording,
    stopRecordingTimer,
    studioReady,
  ]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setRecording(false);
      stopRecordingTimer();
      return;
    }

    recorder.stop();
  }, [stopRecordingTimer]);

  const toggleMusicBed = useCallback(async () => {
    const element = audioElementRef.current;
    if (!element || !selectedMusicTrack) {
      return;
    }

    if (!studioReady) {
      setStatus({ tone: "error", text: "Initialize Studio before playing background music." });
      return;
    }

    if (musicPlaying) {
      element.pause();
      setMusicPlaying(false);
      return;
    }

    try {
      await element.play();
      setMusicPlaying(true);
      setStatus({ tone: "info", text: "Background bed is playing." });
    } catch {
      setStatus({ tone: "error", text: "Browser blocked autoplay. Click play again after interaction." });
    }
  }, [musicPlaying, selectedMusicTrack, studioReady]);

  const loadStored = useCallback(async () => {
    try {
      const stored = await listStoredClips();
      const withUrls = stored.map(buildClipObjectUrl);
      setClips((previous) => {
        revokeClipUrls(previous);
        return withUrls;
      });
      setDbAvailable(true);
    } catch {
      setDbAvailable(false);
      setClips((previous) => {
        revokeClipUrls(previous);
        return [];
      });
    }
  }, []);

  const removeClip = useCallback(async (clipId: string) => {
    setClips((previous) => {
      const next = previous.filter((clip) => clip.id !== clipId);
      const removed = previous.find((clip) => clip.id === clipId);
      if (removed) {
        URL.revokeObjectURL(removed.objectUrl);
      }
      return next;
    });

    try {
      await deleteStoredClip(clipId);
    } catch {
      // no-op: clip already removed from UI
    }
  }, []);

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    loadStored();
    return () => {
      void teardownStudio();
      revokeClipUrls(clipsRef.current);
    };
  }, [loadStored, teardownStudio]);

  useEffect(() => {
    const element = audioElementRef.current;
    if (!element) return;

    element.loop = true;
    if (selectedMusicTrack) {
      element.src = selectedMusicTrack.previewUrl;
      element.load();
      setMusicPlaying(false);
    } else {
      element.pause();
      element.removeAttribute("src");
      setMusicPlaying(false);
    }
  }, [selectedMusicTrack]);

  useEffect(() => {
    if (micGainRef.current) {
      micGainRef.current.gain.setTargetAtTime(micVolume, audioContextRef.current?.currentTime ?? 0, 0.05);
    }
  }, [micVolume]);

  useEffect(() => {
    if (!duckingEnabled && musicGainRef.current) {
      musicGainRef.current.gain.setTargetAtTime(musicVolume, audioContextRef.current?.currentTime ?? 0, 0.05);
    }
  }, [duckingEnabled, musicVolume]);

  useEffect(() => {
    syncMonitorConnection();
  }, [monitorEnabled, syncMonitorConnection]);

  useEffect(() => {
    startDuckingLoop();
    return () => stopDuckingLoop();
  }, [duckingEnabled, musicVolume, startDuckingLoop, stopDuckingLoop]);

  useEffect(() => {
    if (!playableTracks.find((track) => track.id === musicTrackId)) {
      setMusicTrackId(playableTracks[0]?.id ?? "");
    }
  }, [musicTrackId, playableTracks]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <audio
        ref={audioElementRef}
        preload="auto"
        onEnded={() => setMusicPlaying(false)}
        onPause={() => setMusicPlaying(false)}
        onPlay={() => setMusicPlaying(true)}
        style={{ display: "none" }}
      />

      <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.1rem", display: "grid", gap: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Session</h2>

          <div className="field">
            <label>Station</label>
            <select
              value={stationId}
              onChange={(event) => setStationId(event.target.value)}
              disabled={recording}
            >
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} ({station.status})
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Recording mode</label>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${recordMode === "offline" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setRecordMode("offline")}
                disabled={recording}
              >
                Offline recording
              </button>
              <button
                type="button"
                className={`btn btn-sm ${recordMode === "live" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setRecordMode("live")}
                disabled={recording}
              >
                Live mode
              </button>
            </div>
          </div>

          <div className="field">
            <label>Save intent</label>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn btn-sm ${recordIntent === "draft" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setRecordIntent("draft")}
              >
                Save draft
              </button>
              <button
                type="button"
                className={`btn btn-sm ${recordIntent === "podcast" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setRecordIntent("podcast")}
              >
                Podcast intent
              </button>
            </div>
          </div>

          <div className="field">
            <label>Clip label</label>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Evening bulletin draft"
              maxLength={120}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" onClick={initializeStudio} disabled={studioReady}>
              {studioReady ? "Studio ready" : "Initialize studio"}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: "1.1rem", display: "grid", gap: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Mixer</h2>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.86rem", color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={monitorEnabled}
              onChange={(event) => setMonitorEnabled(event.target.checked)}
              disabled={!studioReady}
            />
            Self-monitoring (headphones recommended)
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.86rem", color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={duckingEnabled}
              onChange={(event) => setDuckingEnabled(event.target.checked)}
              disabled={!studioReady}
            />
            Ducking / auto voice-over regulator
          </label>

          <div className="field">
            <label>Mic volume: {Math.round(micVolume * 100)}%</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={micVolume}
              onChange={(event) => setMicVolume(Number(event.target.value))}
              disabled={!studioReady}
            />
          </div>

          <div className="field">
            <label>Music volume: {Math.round(musicVolume * 100)}%</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={(event) => setMusicVolume(Number(event.target.value))}
              disabled={!studioReady}
            />
          </div>

          <div className="field">
            <label>Background music bed</label>
            <select value={musicTrackId} onChange={(event) => setMusicTrackId(event.target.value)}>
              {playableTracks.length === 0 ? (
                <option value="">No uploaded tracks available</option>
              ) : (
                playableTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.artist} — {track.title}
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={toggleMusicBed}
              disabled={!selectedMusicTrack}
            >
              {musicPlaying ? "Pause bed" : "Play bed"}
            </button>
            <Link href={`/dashboard/music?stationId=${currentStation.id}#upload`} className="btn btn-secondary btn-sm">
              Upload new bed
            </Link>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "1.1rem", display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Recorder</h2>

        {recordMode === "live" && (
          <div className="alert alert-info" style={{ margin: 0 }}>
            Live mode currently records full audio locally in your browser and also toggles the server metadata recorder endpoint when available.
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          {!recording ? (
            <button type="button" className="btn btn-primary" onClick={startRecording} disabled={!studioReady}>
              Start recording
            </button>
          ) : (
            <button type="button" className="btn btn-danger" onClick={stopRecording}>
              Stop recording
            </button>
          )}

          <span style={{ fontSize: "0.84rem", color: "var(--text-muted)", fontWeight: 600 }}>
            {recording ? `Recording ${formatSeconds(recordingSeconds)}` : "Recorder idle"}
          </span>
        </div>

        {status && (
          <div className={`alert ${status.tone === "error" ? "alert-error" : status.tone === "success" ? "alert-success" : "alert-info"}`}>
            {status.text}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: "1.1rem", display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Saved Clips</h2>
          <span style={{ fontSize: "0.76rem", color: "var(--text-light)" }}>
            {dbAvailable ? "Saved in browser storage" : "IndexedDB unavailable (session-only)"}
          </span>
        </div>

        {clips.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
            No saved clips yet. Start recording to build draft or podcast takes.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {clips.map((clip) => (
              <div key={clip.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.7rem", display: "grid", gap: "0.55rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.87rem" }}>{clip.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {clip.stationName} · {clip.mode} · {clip.intent} · {formatSeconds(clip.durationSec)} · {formatBytes(clip.sizeBytes)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <a href={clip.objectUrl} download={`${clip.label.replace(/\s+/g, "-").toLowerCase()}.${clip.mimeType.includes("webm") ? "webm" : "wav"}`} className="btn btn-secondary btn-sm">
                      Download
                    </a>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeClip(clip.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                <audio controls preload="none" src={clip.objectUrl} style={{ width: "100%" }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
