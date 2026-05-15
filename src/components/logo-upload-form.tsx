"use client";

import { useState, useRef } from "react";

type Props = {
  stationId: string;
  currentLogoUrl?: string | null;
};

export function LogoUploadForm({ stationId, currentLogoUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(false);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Please select an image file.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await fetch(`/api/stations/${stationId}/logo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        setSuccess(true);
        // Refresh to show new logo
        window.location.reload();
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const displayLogo = preview || currentLogoUrl;

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        {displayLogo && (
          <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayLogo} alt="Station logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: 1, display: "grid", gap: "0.75rem" }}>
          <div className="field">
            <label htmlFor="logo-file">Upload Logo</label>
            <input
              id="logo-file"
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
            <span className="hint">JPG, PNG, or WebP. Square image, 500x500 to 3000x3000px. Max 1MB.</span>
          </div>
          {error && <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>}
          {success && <p style={{ margin: 0, color: "#16a34a", fontSize: "0.875rem" }}>Logo uploaded successfully!</p>}
          <div>
            <button className="btn btn-primary btn-sm" type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Logo"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
