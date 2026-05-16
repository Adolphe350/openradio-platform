"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = { stationId: string };

export function UploadTrackForm({ stationId }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    if (!fileInput?.files?.length) {
      setMessage("Please select a file.");
      setStatus("error");
      return;
    }

    const file = fileInput.files[0];
    const MAX = 50 * 1024 * 1024;
    if (file.size > MAX) {
      setMessage(`File too large. Maximum size is 50 MB.`);
      setStatus("error");
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setMessage("Uploading…");

    const formData = new FormData(form);

    try {
      // Use XMLHttpRequest so we can track upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `/api/stations/${stationId}/upload`);

        xhr.upload.addEventListener("progress", (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            try {
              const body = JSON.parse(xhr.responseText);
              reject(new Error(body.error ?? "Upload failed"));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
        xhr.send(formData);
      });

      setStatus("done");
      setMessage("Track uploaded successfully!");
      form.reset();
      setProgress(0);
      // Refresh the page data to show the new track
      router.refresh();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem" }}
    >
      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <label htmlFor="file">Audio file</label>
        <input
          id="file" name="file" type="file"
          accept="audio/mpeg,audio/mp3,audio/flac,audio/ogg,audio/wav,audio/aac,audio/*"
          required
          style={{ padding: "0.45rem" }}
          onChange={() => { setStatus("idle"); setMessage(""); }}
        />
        <span className="hint">MP3, FLAC, OGG, WAV or AAC · Max 50 MB</span>
      </div>

      <div className="field">
        <label htmlFor="ul-title">Title</label>
        <input id="ul-title" name="title" placeholder="Auto-filled from filename" maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="ul-artist">Artist</label>
        <input id="ul-artist" name="artist" placeholder="Artist name" maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="ul-album">Album</label>
        <input id="ul-album" name="album" placeholder="Album (optional)" maxLength={120} />
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={status === "uploading"}
          style={{ opacity: status === "uploading" ? 0.6 : 1 }}
        >
          {status === "uploading" ? `Uploading ${progress}%…` : "Upload track"}
        </button>
      </div>

      {/* Progress bar */}
      {status === "uploading" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--brand)", transition: "width 0.2s", borderRadius: 999 }} />
          </div>
        </div>
      )}

      {message && (
        <div
          className={`alert ${status === "error" ? "alert-error" : "alert-success"}`}
          style={{ gridColumn: "1 / -1" }}
        >
          {message}
        </div>
      )}
    </form>
  );
}
