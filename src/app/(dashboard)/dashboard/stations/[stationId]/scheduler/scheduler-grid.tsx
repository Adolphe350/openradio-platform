"use client";

import { useState, useTransition, useMemo } from "react";
import {
  createScheduleBlockAction,
  updateScheduleBlockAction,
  deleteScheduleBlockAction,
  toggleScheduleBlockAction,
} from "./actions";

// ─── Types ───────────────────────────────────────────────────────────────────

type SourceType =
  | "PLAYLIST"
  | "PODCAST_EPISODE"
  | "RECORDING"
  | "TRACK"
  | "RANDOM_ALL"
  | "LIVE_SLOT";

type ScheduleBlock = {
  id: string;
  name: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  sourceType: SourceType;
  sourceId: string | null;
  playlistId: string | null;
  color: string | null;
  notes: string | null;
  isActive: boolean;
  playlistName: string | null;
};

type Playlist = {
  id: string;
  name: string;
  description?: string;
  trackCount?: number;
};

type Track = {
  id: string;
  title: string;
  artist: string;
  durationSec?: number;
};

type Recording = {
  id: string;
  label: string;
  date?: string;
  hasFile: boolean;
};

type Episode = {
  id: string;
  title: string;
  podcastTitle: string;
  durationSec?: number;
};

type Props = {
  stationId: string;
  schedules: ScheduleBlock[];
  playlists: Playlist[];
  tracks: Track[];
  recordings: Recording[];
  episodes: Episode[];
};

// ─── Library types ────────────────────────────────────────────────────────────

type LibraryTab = "all" | "playlists" | "podcasts" | "recordings" | "tracks" | "special";
type LibraryView = "grid" | "list";

type LibraryItem = {
  id: string;
  sourceType: SourceType;
  name: string;
  subtitle: string;
  badge: string;
  color: string;
  meta?: string;
  unavailable?: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = [
  { label: "Mon", dayOfWeek: 1 },
  { label: "Tue", dayOfWeek: 2 },
  { label: "Wed", dayOfWeek: 3 },
  { label: "Thu", dayOfWeek: 4 },
  { label: "Fri", dayOfWeek: 5 },
  { label: "Sat", dayOfWeek: 6 },
  { label: "Sun", dayOfWeek: 0 },
];

const SOURCE_LABELS: Record<SourceType, string> = {
  PLAYLIST: "Playlist",
  PODCAST_EPISODE: "Podcast Episode",
  RECORDING: "Recording",
  TRACK: "Single Track",
  RANDOM_ALL: "Random (All Tracks)",
  LIVE_SLOT: "Live Slot",
};

const DEFAULT_COLORS: Record<SourceType, string> = {
  PLAYLIST: "#3b82f6",
  PODCAST_EPISODE: "#8b5cf6",
  RECORDING: "#f59e0b",
  TRACK: "#10b981",
  RANDOM_ALL: "#6b7280",
  LIVE_SLOT: "#ef4444",
};

const BADGE_LABELS: Record<SourceType, string> = {
  PLAYLIST: "Playlist",
  PODCAST_EPISODE: "Podcast",
  RECORDING: "Recording",
  TRACK: "Track",
  RANDOM_ALL: "Random",
  LIVE_SLOT: "Live",
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ─── Utility functions ────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function timeLabel(h: number, m: number) {
  return `${pad(h)}:${pad(m)}`;
}

function blockColor(block: ScheduleBlock): string {
  return block.color ?? DEFAULT_COLORS[block.sourceType] ?? "#6b7280";
}

function sourceLabel(block: ScheduleBlock): string {
  if (block.sourceType === "PLAYLIST") return block.playlistName ?? "Playlist";
  return SOURCE_LABELS[block.sourceType] ?? block.sourceType;
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ─── Special library items (always present) ───────────────────────────────────

const SPECIAL_ITEMS: LibraryItem[] = [
  {
    id: "__random_all__",
    sourceType: "RANDOM_ALL",
    name: "Random (All Tracks)",
    subtitle: "AutoDJ shuffles all station tracks",
    badge: "Random",
    color: DEFAULT_COLORS.RANDOM_ALL,
    meta: "Default fallback",
  },
  {
    id: "__live_slot__",
    sourceType: "LIVE_SLOT",
    name: "Live Slot",
    subtitle: "Reserved for live encoder input",
    badge: "Live",
    color: DEFAULT_COLORS.LIVE_SLOT,
    meta: "No AutoDJ audio",
  },
];

// ─── Default form state ───────────────────────────────────────────────────────

type BlockForm = {
  blockId?: string;
  name: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  sourceType: SourceType;
  sourceId: string;
  color: string;
  notes: string;
  isActive: boolean;
};

function defaultForm(dayOfWeek = 1, startHour = 8): BlockForm {
  return {
    name: "",
    dayOfWeek,
    startHour,
    startMin: 0,
    endHour: (startHour + 2) % 24,
    endMin: 0,
    sourceType: "RANDOM_ALL",
    sourceId: "",
    color: "",
    notes: "",
    isActive: true,
  };
}

function blockToForm(block: ScheduleBlock): BlockForm {
  return {
    blockId: block.id,
    name: block.name,
    dayOfWeek: block.dayOfWeek,
    startHour: block.startHour,
    startMin: block.startMin,
    endHour: block.endHour,
    endMin: block.endMin,
    sourceType: block.sourceType,
    sourceId: block.playlistId ?? block.sourceId ?? "",
    color: block.color ?? "",
    notes: block.notes ?? "",
    isActive: block.isActive,
  };
}

// ─── Source picker ────────────────────────────────────────────────────────────

function SourcePicker({
  sourceType,
  sourceId,
  playlists,
  tracks,
  recordings,
  episodes,
  onChange,
}: {
  sourceType: SourceType;
  sourceId: string;
  playlists: Playlist[];
  tracks: Track[];
  recordings: Recording[];
  episodes: Episode[];
  onChange: (sourceId: string) => void;
}) {
  if (sourceType === "RANDOM_ALL" || sourceType === "LIVE_SLOT") {
    return (
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
        {sourceType === "RANDOM_ALL"
          ? "AutoDJ will shuffle all station tracks."
          : "This slot is reserved for a live encoder connection."}
      </p>
    );
  }

  const options: Array<{ value: string; label: string }> = (() => {
    if (sourceType === "PLAYLIST") return playlists.map((p) => ({ value: p.id, label: p.name }));
    if (sourceType === "TRACK") return tracks.map((t) => ({ value: t.id, label: `${t.title} — ${t.artist}` }));
    if (sourceType === "RECORDING") return recordings.map((r) => ({ value: r.id, label: r.label }));
    if (sourceType === "PODCAST_EPISODE")
      return episodes.map((e) => ({ value: e.id, label: `${e.podcastTitle} — ${e.title}` }));
    return [];
  })();

  if (options.length === 0) {
    return (
      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
        No {SOURCE_LABELS[sourceType].toLowerCase()}s available yet.
      </p>
    );
  }

  return (
    <div className="field">
      <label>Select {SOURCE_LABELS[sourceType]}</label>
      <select value={sourceId} onChange={(e) => onChange(e.target.value)} required>
        <option value="">— Choose —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Block Modal ──────────────────────────────────────────────────────────────

function BlockModal({
  stationId,
  form,
  playlists,
  tracks,
  recordings,
  episodes,
  onClose,
  onDelete,
}: {
  stationId: string;
  form: BlockForm;
  playlists: Playlist[];
  tracks: Track[];
  recordings: Recording[];
  episodes: Episode[];
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [state, setState] = useState<BlockForm>(form);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!state.blockId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("stationId", stationId);
    if (state.blockId) fd.set("blockId", state.blockId);
    fd.set("name", state.name);
    fd.set("dayOfWeek", String(state.dayOfWeek));
    fd.set("startHour", String(state.startHour));
    fd.set("startMin", String(state.startMin));
    fd.set("endHour", String(state.endHour));
    fd.set("endMin", String(state.endMin));
    fd.set("sourceType", state.sourceType);
    fd.set("sourceId", state.sourceId);
    if (state.sourceType === "PLAYLIST") fd.set("playlistId", state.sourceId);
    fd.set("color", state.color);
    fd.set("notes", state.notes);
    fd.set("isActive", String(state.isActive));

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateScheduleBlockAction(fd);
        } else {
          await createScheduleBlockAction(fd);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleDelete() {
    if (!state.blockId) return;
    const fd = new FormData();
    fd.set("stationId", stationId);
    fd.set("blockId", state.blockId);
    startTransition(async () => {
      try {
        await deleteScheduleBlockAction(fd);
        onDelete?.();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  const colorPreview = state.color || DEFAULT_COLORS[state.sourceType] || "#6b7280";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{ width: "min(580px, 100%)", maxHeight: "90vh", overflowY: "auto", padding: "1.5rem" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
            {isEdit ? "Edit Schedule Block" : "New Schedule Block"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              color: "var(--text-muted)",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          {/* Block name */}
          <div className="field">
            <label>Block name *</label>
            <input
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              required
              maxLength={80}
              placeholder="e.g. Morning Show"
            />
          </div>

          {/* Day */}
          <div className="field">
            <label>Day of week</label>
            <select
              value={state.dayOfWeek}
              onChange={(e) => setState((s) => ({ ...s, dayOfWeek: parseInt(e.target.value, 10) }))}
            >
              <option value={-1}>Every day</option>
              {DAYS.map((d) => (
                <option key={d.dayOfWeek} value={d.dayOfWeek}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label>Start hour</label>
              <select
                value={state.startHour}
                onChange={(e) => setState((s) => ({ ...s, startHour: parseInt(e.target.value, 10) }))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Start min</label>
              <select
                value={state.startMin}
                onChange={(e) => setState((s) => ({ ...s, startMin: parseInt(e.target.value, 10) }))}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>End hour</label>
              <select
                value={state.endHour}
                onChange={(e) => setState((s) => ({ ...s, endHour: parseInt(e.target.value, 10) }))}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {pad(h)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>End min</label>
              <select
                value={state.endMin}
                onChange={(e) => setState((s) => ({ ...s, endMin: parseInt(e.target.value, 10) }))}
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {pad(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Source type */}
          <div className="field">
            <label>Source type</label>
            <select
              value={state.sourceType}
              onChange={(e) =>
                setState((s) => ({ ...s, sourceType: e.target.value as SourceType, sourceId: "" }))
              }
            >
              {(Object.keys(SOURCE_LABELS) as SourceType[]).map((t) => (
                <option key={t} value={t}>
                  {SOURCE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Source picker */}
          <SourcePicker
            sourceType={state.sourceType}
            sourceId={state.sourceId}
            playlists={playlists}
            tracks={tracks}
            recordings={recordings}
            episodes={episodes}
            onChange={(id) => setState((s) => ({ ...s, sourceId: id }))}
          />

          {/* Color + Notes */}
          <div
            style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.75rem", alignItems: "end" }}
          >
            <div className="field">
              <label>Colour</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={colorPreview}
                  onChange={(e) => setState((s) => ({ ...s, color: e.target.value }))}
                  style={{
                    width: 40,
                    height: 36,
                    padding: 2,
                    border: "1.5px solid var(--border)",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                />
                <input
                  type="text"
                  value={state.color}
                  onChange={(e) => setState((s) => ({ ...s, color: e.target.value }))}
                  placeholder="auto"
                  style={{ flex: 1 }}
                  maxLength={7}
                />
              </div>
            </div>
            <div className="field">
              <label>Notes (optional)</label>
              <input
                value={state.notes}
                onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Short description"
                maxLength={200}
              />
            </div>
          </div>

          {/* Active toggle */}
          <label
            style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontSize: "0.9rem" }}
          >
            <input
              type="checkbox"
              checked={state.isActive}
              onChange={(e) => setState((s) => ({ ...s, isActive: e.target.checked }))}
              style={{ width: 16, height: 16 }}
            />
            Block is active (enabled in AutoDJ)
          </label>

          {/* Actions */}
          <div
            style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem" }}
          >
            {isEdit && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={isPending}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Create block"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Content Library ──────────────────────────────────────────────────────────

function TypeBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.1rem 0.45rem",
        borderRadius: 999,
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: `${color}22`,
        color,
        border: `1px solid ${color}44`,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function LibraryCard({
  item,
  onSchedule,
}: {
  item: LibraryItem;
  onSchedule: (item: LibraryItem) => void;
}) {
  return (
    <div className="lib-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.3rem" }}>
        <TypeBadge label={item.badge} color={item.color} />
        {item.unavailable && (
          <span style={{ fontSize: "0.6rem", color: "var(--text-light)", flexShrink: 0 }}>no file</span>
        )}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--text)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: 1.35,
        }}
      >
        {item.name}
      </p>
      {item.subtitle && (
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            color: "var(--text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.subtitle}
        </p>
      )}
      {item.meta && (
        <p
          style={{
            margin: 0,
            fontSize: "0.68rem",
            color: "var(--text-light)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.meta}
        </p>
      )}
      <button
        className="btn btn-secondary btn-sm"
        style={{ marginTop: "0.25rem", fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}
        onClick={() => onSchedule(item)}
      >
        + Schedule
      </button>
    </div>
  );
}

function LibraryRow({
  item,
  onSchedule,
}: {
  item: LibraryItem;
  onSchedule: (item: LibraryItem) => void;
}) {
  return (
    <div className="lib-row">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: item.color,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {item.name}
        </div>
        {(item.subtitle || item.meta) && (
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-light)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.subtitle}
            {item.subtitle && item.meta ? " · " : ""}
            {item.meta}
          </div>
        )}
      </div>
      <TypeBadge label={item.badge} color={item.color} />
      <button
        className="btn btn-secondary btn-sm"
        style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", flexShrink: 0 }}
        onClick={() => onSchedule(item)}
        title={`Schedule "${item.name}"`}
      >
        +
      </button>
    </div>
  );
}

const TAB_DEFS: Array<{ id: LibraryTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "playlists", label: "Playlists" },
  { id: "podcasts", label: "Podcasts" },
  { id: "recordings", label: "Recordings" },
  { id: "tracks", label: "Tracks" },
  { id: "special", label: "Special" },
];

function ContentLibrary({
  playlists,
  tracks,
  recordings,
  episodes,
  onSchedule,
}: {
  playlists: Playlist[];
  tracks: Track[];
  recordings: Recording[];
  episodes: Episode[];
  onSchedule: (item: LibraryItem) => void;
}) {
  const [tab, setTab] = useState<LibraryTab>("all");
  const [view, setView] = useState<LibraryView>("list");
  const [search, setSearch] = useState("");

  const items = useMemo<LibraryItem[]>(() => {
    const result: LibraryItem[] = [];

    if (tab === "all" || tab === "playlists") {
      for (const p of playlists) {
        const countLabel = p.trackCount !== undefined ? `${p.trackCount} track${p.trackCount === 1 ? "" : "s"}` : undefined;
        result.push({
          id: p.id,
          sourceType: "PLAYLIST",
          name: p.name,
          subtitle: p.description ?? countLabel ?? "Playlist",
          badge: BADGE_LABELS.PLAYLIST,
          color: DEFAULT_COLORS.PLAYLIST,
          meta: p.trackCount !== undefined ? `${p.trackCount} tracks` : undefined,
        });
      }
    }

    if (tab === "all" || tab === "podcasts") {
      for (const e of episodes) {
        result.push({
          id: e.id,
          sourceType: "PODCAST_EPISODE",
          name: e.title,
          subtitle: e.podcastTitle,
          badge: BADGE_LABELS.PODCAST_EPISODE,
          color: DEFAULT_COLORS.PODCAST_EPISODE,
          meta: e.durationSec ? formatDuration(e.durationSec) : undefined,
        });
      }
    }

    if (tab === "all" || tab === "recordings") {
      for (const r of recordings) {
        result.push({
          id: r.id,
          sourceType: "RECORDING",
          name: r.label,
          subtitle: r.date ? `Recorded ${r.date}` : r.label,
          badge: BADGE_LABELS.RECORDING,
          color: DEFAULT_COLORS.RECORDING,
          meta: r.hasFile ? "File available" : "No file",
          unavailable: !r.hasFile,
        });
      }
    }

    if (tab === "all" || tab === "tracks") {
      for (const t of tracks) {
        result.push({
          id: t.id,
          sourceType: "TRACK",
          name: t.title,
          subtitle: t.artist,
          badge: BADGE_LABELS.TRACK,
          color: DEFAULT_COLORS.TRACK,
          meta: t.durationSec ? formatDuration(t.durationSec) : undefined,
        });
      }
    }

    if (tab === "all" || tab === "special") {
      result.push(...SPECIAL_ITEMS);
    }

    if (!search.trim()) return result;
    const q = search.toLowerCase();
    return result.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
    );
  }, [tab, search, playlists, tracks, recordings, episodes]);

  const totalByTab: Record<LibraryTab, number> = useMemo(() => {
    return {
      all: playlists.length + episodes.length + recordings.length + tracks.length + 2,
      playlists: playlists.length,
      podcasts: episodes.length,
      recordings: recordings.length,
      tracks: tracks.length,
      special: 2,
    };
  }, [playlists, episodes, recordings, tracks]);

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 0.75rem 0.6rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>Content Library</h3>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-muted)" }}>
            Click + Schedule to add to calendar
          </p>
        </div>
        {/* View toggle */}
        <div
          style={{
            display: "flex",
            border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
          }}
        >
          {(["list", "grid"] as LibraryView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={v === "grid" ? "Grid view" : "List view"}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: view === v ? "var(--brand-light)" : "transparent",
                border: "none",
                cursor: "pointer",
                color: view === v ? "var(--brand-dark)" : "var(--text-muted)",
                fontSize: "0.85rem",
                transition: "background 120ms",
              }}
            >
              {v === "grid" ? "⊞" : "≡"}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="lib-tabs">
        {TAB_DEFS.map((t) => (
          <button
            key={t.id}
            className={`lib-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {totalByTab[t.id] > 0 && (
              <span
                style={{
                  marginLeft: "0.3rem",
                  fontSize: "0.62rem",
                  color: tab === t.id ? "var(--brand-dark)" : "var(--text-light)",
                }}
              >
                {totalByTab[t.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--border)" }}>
        <input
          type="search"
          placeholder="Search content…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: "0.8rem", padding: "0.4rem 0.65rem" }}
        />
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div style={{ padding: "1.5rem 0.75rem", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {search ? "No content matches your search." : "No content in this category yet."}
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="lib-grid">
          {items.map((item) => (
            <LibraryCard key={item.id} item={item} onSchedule={onSchedule} />
          ))}
        </div>
      ) : (
        <div className="lib-list">
          {items.map((item) => (
            <LibraryRow key={item.id} item={item} onSchedule={onSchedule} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Week grid ────────────────────────────────────────────────────────────────

const GRID_HOUR_HEIGHT = 48;
const HEADER_HEIGHT = 36;
const TIME_COL_WIDTH = 48;

function BlockChip({
  block,
  onClick,
}: {
  block: ScheduleBlock;
  onClick: () => void;
}) {
  const topPx = (block.startHour + block.startMin / 60) * GRID_HOUR_HEIGHT;
  const heightPx =
    (block.endHour + block.endMin / 60 - (block.startHour + block.startMin / 60)) * GRID_HOUR_HEIGHT;
  const color = blockColor(block);
  const opacity = block.isActive ? 1 : 0.45;

  return (
    <div
      onClick={onClick}
      title={`${block.name}\n${timeLabel(block.startHour, block.startMin)} – ${timeLabel(block.endHour, block.endMin)}\n${sourceLabel(block)}`}
      style={{
        position: "absolute",
        top: topPx + 1,
        left: 2,
        right: 2,
        height: Math.max(heightPx - 2, 18),
        background: color,
        opacity,
        borderRadius: 5,
        padding: "2px 5px",
        overflow: "hidden",
        cursor: "pointer",
        color: "#fff",
        fontSize: "0.72rem",
        fontWeight: 600,
        lineHeight: 1.3,
        userSelect: "none",
        zIndex: 2,
        boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {block.name}
      </span>
      {heightPx > 36 && (
        <span
          style={{
            opacity: 0.85,
            fontSize: "0.68rem",
            fontWeight: 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {sourceLabel(block)}
        </span>
      )}
      {heightPx > 54 && (
        <span style={{ opacity: 0.8, fontSize: "0.65rem", fontWeight: 400 }}>
          {timeLabel(block.startHour, block.startMin)}–{timeLabel(block.endHour, block.endMin)}
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SchedulerGrid({
  stationId,
  schedules,
  playlists,
  tracks,
  recordings,
  episodes,
}: Props) {
  const [modal, setModal] = useState<BlockForm | null>(null);
  const [isPending, startTransition] = useTransition();

  const everyDayBlocks = schedules.filter((s) => s.dayOfWeek === -1);

  function openNew(dayOfWeek: number, startHour: number) {
    setModal(defaultForm(dayOfWeek, startHour));
  }

  function openEdit(block: ScheduleBlock) {
    setModal(blockToForm(block));
  }

  function openFromLibrary(item: LibraryItem) {
    const isSpecial = item.sourceType === "RANDOM_ALL" || item.sourceType === "LIVE_SLOT";
    setModal({
      ...defaultForm(),
      name: item.name,
      sourceType: item.sourceType,
      sourceId: isSpecial ? "" : item.id,
      color: item.color,
    });
  }

  function handleToggle(block: ScheduleBlock) {
    const fd = new FormData();
    fd.set("stationId", stationId);
    fd.set("blockId", block.id);
    fd.set("isActive", String(block.isActive));
    startTransition(() => toggleScheduleBlockAction(fd));
  }

  const gridHeight = GRID_HOUR_HEIGHT * 24;

  return (
    <>
      {/* Two-panel layout: Content Library (left) + Calendar (right) */}
      <div className="scheduler-panel-layout">
        {/* ── Content Library ─────────────────────────────────────── */}
        <div className="scheduler-library-panel">
          <ContentLibrary
            playlists={playlists}
            tracks={tracks}
            recordings={recordings}
            episodes={episodes}
            onSchedule={openFromLibrary}
          />
        </div>

        {/* ── Calendar + Table ─────────────────────────────────────── */}
        <div>
          {/* Controls row */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <button className="btn btn-primary btn-sm" onClick={() => setModal(defaultForm())}>
              + Add block
            </button>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Click a time slot or pick from the library to add a block.
            </span>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {(Object.entries(SOURCE_LABELS) as [SourceType, string][]).map(([type, label]) => (
              <span
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: DEFAULT_COLORS[type],
                    display: "inline-block",
                  }}
                />
                {label}
              </span>
            ))}
          </div>

          {/* Week grid */}
          <div className="card" style={{ overflow: "auto", padding: 0 }}>
            {/* Header row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, minmax(80px, 1fr))`,
                borderBottom: "1px solid var(--border)",
                position: "sticky",
                top: 0,
                background: "var(--bg)",
                zIndex: 10,
              }}
            >
              <div style={{ height: HEADER_HEIGHT }} />
              {DAYS.map((d) => (
                <div
                  key={d.dayOfWeek}
                  style={{
                    height: HEADER_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    borderLeft: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                  onClick={() => openNew(d.dayOfWeek, 8)}
                  title={`Add block for ${d.label}`}
                >
                  {d.label}
                </div>
              ))}
            </div>

            {/* Body: hour rows + day columns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, minmax(80px, 1fr))`,
                position: "relative",
              }}
            >
              {/* Time gutter */}
              <div style={{ position: "relative", height: gridHeight }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{
                      position: "absolute",
                      top: h * GRID_HOUR_HEIGHT,
                      right: 6,
                      fontSize: "0.65rem",
                      color: "var(--text-light)",
                      lineHeight: "1",
                      userSelect: "none",
                    }}
                  >
                    {pad(h)}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map((d) => {
                const dayBlocks = schedules.filter((s) => s.dayOfWeek === d.dayOfWeek);
                const allForDay = [...everyDayBlocks, ...dayBlocks];

                return (
                  <div
                    key={d.dayOfWeek}
                    style={{
                      position: "relative",
                      height: gridHeight,
                      borderLeft: "1px solid var(--border)",
                      cursor: "crosshair",
                    }}
                    onClick={(e) => {
                      if (e.currentTarget === e.target) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const clickedHour = Math.floor(y / GRID_HOUR_HEIGHT);
                        openNew(d.dayOfWeek, clickedHour);
                      }
                    }}
                  >
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        style={{
                          position: "absolute",
                          top: h * GRID_HOUR_HEIGHT,
                          left: 0,
                          right: 0,
                          borderTop: `1px solid ${h === 0 ? "transparent" : "var(--border)"}`,
                          height: GRID_HOUR_HEIGHT,
                          pointerEvents: "none",
                        }}
                      />
                    ))}
                    {allForDay.map((block) => (
                      <BlockChip key={block.id} block={block} onClick={() => openEdit(block)} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty fallback notice */}
          {schedules.length === 0 && (
            <div className="alert alert-info" style={{ marginTop: "1rem" }}>
              No schedule blocks yet. AutoDJ will play all station tracks randomly 24/7. Pick content from
              the library or click a time slot to schedule your first block.
            </div>
          )}

          {/* Schedule list (compact table below grid) */}
          {schedules.length > 0 && (
            <div className="card" style={{ marginTop: "1.5rem", overflow: "hidden" }}>
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                  All Schedule Blocks ({schedules.length})
                </h3>
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 12 }} />
                      <th>Block name</th>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} style={{ opacity: s.isActive ? 1 : 0.55 }}>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              width: 10,
                              height: 10,
                              borderRadius: 3,
                              background: blockColor(s),
                            }}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>
                          {s.dayOfWeek === -1
                            ? "Every day"
                            : DAYS.find((d) => d.dayOfWeek === s.dayOfWeek)?.label ?? String(s.dayOfWeek)}
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {timeLabel(s.startHour, s.startMin)} – {timeLabel(s.endHour, s.endMin)}
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>{sourceLabel(s)}</td>
                        <td>
                          <span className={`badge ${s.isActive ? "badge-green" : "badge-gray"}`}>
                            {s.isActive ? "Active" : "Paused"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEdit(s)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleToggle(s)}
                              disabled={isPending}
                            >
                              {s.isActive ? "Pause" : "Enable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AutoDJ Fallback notice */}
          <div className="alert alert-info" style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
            <strong>AutoDJ Fallback:</strong> When no schedule block is active, AutoDJ plays all station
            tracks in random rotation. The Liquidsoap config is regenerated automatically whenever you add,
            edit, or delete a block.
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <BlockModal
          stationId={stationId}
          form={modal}
          playlists={playlists}
          tracks={tracks}
          recordings={recordings}
          episodes={episodes}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
