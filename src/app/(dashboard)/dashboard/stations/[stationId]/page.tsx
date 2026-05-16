import Link from "next/link";
import { StationStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { metricSourceLabel, resolveStationMetric } from "@/lib/analytics";
import { db } from "@/lib/db";
import { getPublicStreamUrl, getSourceEndpoint } from "@/lib/stream";
import { formatDuration } from "@/lib/utils";

import {
  addTrackToPlaylistAction,
  createPlaylistAction,
  createTrackAction,
  deletePlaylistAction,
  deleteStationAction,
  deleteTrackAction,
  movePlaylistTrackAction,
  removePlaylistTrackAction,
  renameStationAction,
  updatePlaylistAction,
  updateStationMetadataAction,
  updateStationStatusAction,
  updateTrackAction,
} from "../../actions";

import {
  addGeoBlockAction,
  removeGeoBlockAction,
  addRelayAction,
  removeRelayAction,
  toggleRelayAction,
  addScheduleBlockAction,
  removeScheduleBlockAction,
  addAnnouncementAction,
  removeAnnouncementAction,
  toggleAnnouncementAction,
  startRecordingAction,
  stopRecordingAction,
} from "./station-actions";

import { UploadTrackForm } from "@/components/upload-track-form";
import { LogoUploadForm } from "@/components/logo-upload-form";
import { LiveListeners } from "@/components/live-listeners";
import { DashboardMobileShell } from "@/components/dashboard-mobile-shell";

type Props = {
  params: Promise<{ stationId: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
};

const DAYS = ["Every day", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STATUS_OPTIONS: StationStatus[] = ["DRAFT", "ACTIVE", "PAUSED"];

function pad(n: number) { return String(n).padStart(2, "0"); }

export default async function StationDetailPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { stationId } = await params;
  const { tab = "overview", error } = await searchParams;

  const station = await db.station.findFirst({
    where: { id: stationId, ownerId: user.id },
    include: {
      metrics: { orderBy: { sampledAt: "desc" }, take: 1 },
      tracks: { orderBy: { createdAt: "desc" } },
      playlists: {
        orderBy: { createdAt: "asc" },
        include: {
          tracks: { orderBy: { position: "asc" }, include: { track: true } },
        },
      },
    },
  });

  if (!station) notFound();

  const source = getSourceEndpoint(station.mountPath);
  const streamUrl = getPublicStreamUrl(station.mountPath);
  const m3uUrl = `${streamUrl}.m3u`;
  const plsUrl = `${streamUrl}.pls`;

  // Compute AutoDJ % from last 7 days of PlayLog
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const playLogs = await db.playLog.findMany({
    where: { stationId: station.id, playedAt: { gte: sevenDaysAgo } },
    select: { trackId: true, durationSec: true },
  });
  const totalDuration = playLogs.reduce((s, l) => s + (l.durationSec ?? 0), 0);
  const autoDjDuration = playLogs.filter((l) => l.trackId !== null).reduce((s, l) => s + (l.durationSec ?? 0), 0);
  const autoDjPct = totalDuration > 0 ? Math.round((autoDjDuration / totalDuration) * 100) : 0;

  // Source proxy connection URL for HTTPS port 443
  const { env } = await import("@/lib/env");
  const appHost = (() => {
    try {
      return new URL(env.APP_BASE_URL).hostname;
    } catch {
      return env.APP_BASE_URL;
    }
  })();
  const appPort = (() => {
    try {
      const u = new URL(env.APP_BASE_URL);
      return u.port || (u.protocol === "https:" ? "443" : "80");
    } catch {
      return "443";
    }
  })();

  const metricState = await resolveStationMetric({
    stationId: station.id,
    mountPath: station.mountPath,
    trackCount: station.tracks.length,
    playlistCount: station.playlists.length,
    createdAt: station.createdAt,
    metric: station.metrics[0]
      ? {
          currentListeners: station.metrics[0].currentListeners,
          peakListeners: station.metrics[0].peakListeners,
          totalListeningHours: station.metrics[0].totalListeningHours,
          uptimePercent: station.metrics[0].uptimePercent,
          storageUsedMb: station.metrics[0].storageUsedMb,
          sampledAt: station.metrics[0].sampledAt,
        }
      : null,
  });

  return (
    <main className="container" style={{ width: "100%", margin: 0, padding: "1.5rem 0 2rem", display: "grid", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <Link href="/dashboard" className="muted" style={{ fontSize: "0.8rem", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
            ← Back to stations
          </Link>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem" }}>{station.name}</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            /{station.slug} · {station.status}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href={`/stations/${station.slug}`} className="btn secondary">Public page</Link>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {/* Rename + Status Row */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>Rename station</h3>
          <form action={renameStationAction} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <input className="input" name="name" defaultValue={station.name} required minLength={3} style={{ flex: 1 }} />
            <button className="btn secondary" type="submit">Rename</button>
          </form>
        </div>
        <div className="card" style={{ padding: "1.25rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>Station status</h3>
          <form action={updateStationStatusAction} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <select name="status" defaultValue={station.status} style={{ flex: 1 }}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button className="btn secondary" type="submit">Update</button>
          </form>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div className="card stat-card" style={{ padding: "1rem" }}>
          <span className="stat-label">Listeners</span>
          <span className="stat-value">{metricState.metric.currentListeners}</span>
          <span className="badge" style={{ marginTop: "0.25rem", fontSize: "0.65rem" }}>{metricSourceLabel(metricState.source)}</span>
        </div>
        <div className="card stat-card" style={{ padding: "1rem" }}>
          <span className="stat-label">Peak</span>
          <span className="stat-value">{metricState.metric.peakListeners}</span>
        </div>
        <div className="card stat-card" style={{ padding: "1rem" }}>
          <span className="stat-label">Uptime</span>
          <span className="stat-value">{metricState.metric.uptimePercent.toFixed(1)}%</span>
        </div>
        <div className="card stat-card" style={{ padding: "1rem" }}>
          <span className="stat-label">Tracks</span>
          <span className="stat-value">{station.tracks.length}</span>
        </div>
        <div className="card stat-card" style={{ padding: "1rem" }}>
          <span className="stat-label">Playlists</span>
          <span className="stat-value">{station.playlists.length}</span>
        </div>
      </div>

      {/* Connection Info */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Encoder Connection</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <div style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Host</p>
            <code>{source.host}</code>
          </div>
          <div style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Port</p>
            <code>{source.port}</code>
          </div>
          <div style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Mount</p>
            <code>{source.mountPath}</code>
          </div>
          <div style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Username</p>
            <code>{station.sourceUsername}</code>
          </div>
          <div style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Password</p>
            <code>{station.sourcePassword}</code>
          </div>
          <div style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase" }}>Stream URL</p>
            <code style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>{publicStreamUrl}</code>
          </div>
        </div>
      </div>

      {/* Station metadata */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Metadata</h2>
        <form action={updateStationMetadataAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", alignItems: "end" }}>
          <input type="hidden" name="stationId" value={station.id} />
          <div className="field">
            <label htmlFor="genre">Genre</label>
            <input id="genre" name="genre" className="input" defaultValue={station.genre ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" className="input" defaultValue={station.description ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="streamDescription">Stream description</label>
            <input id="streamDescription" name="streamDescription" className="input" defaultValue={station.streamDescription ?? ""} />
          </div>
          <div>
            <button className="btn primary" type="submit">Save metadata</button>
          </div>
        </form>
      </div>

      {/* Tracks and Playlists */}
      <div className="station-split">
        {/* Tracks */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Tracks ({station.tracks.length})</h2>

          <form action={createTrackAction} style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem", padding: "1rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div className="field">
                <label htmlFor="title">Title</label>
                <input id="title" className="input" name="title" required maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="artist">Artist</label>
                <input id="artist" className="input" name="artist" required maxLength={120} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.5rem" }}>
              <div className="field">
                <label htmlFor="album">Album</label>
                <input id="album" name="album" maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="durationSec">Duration (s)</label>
                <input id="durationSec" className="input" name="durationSec" type="number" min={1} />
              </div>
              <div className="field">
                <label htmlFor="fileUrl">File URL</label>
                <input id="fileUrl" className="input" name="fileUrl" type="url" placeholder="https://..." />
              </div>
            </div>
            <button className="btn primary" type="submit" style={{ justifySelf: "start" }}>Add track</button>
          </form>

          <div style={{ maxHeight: "500px", overflowY: "auto", display: "grid", gap: "0.5rem" }}>
            {station.tracks.map((track) => (
              <div key={track.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", display: "grid", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "0.9rem" }}>{track.title}</strong>
                    <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}>{track.artist}</span>
                  </div>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>{formatDuration(track.durationSec)}</span>
                </div>

                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <details style={{ width: "100%" }}>
                    <summary style={{ fontSize: "0.8rem" }}>Edit</summary>
                    <form action={updateTrackAction} style={{ display: "grid", gap: "0.4rem", marginTop: "0.5rem" }}>
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="trackId" value={track.id} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                        <input className="input" name="title" defaultValue={track.title} required />
                        <input className="input" name="artist" defaultValue={track.artist} required />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.4rem" }}>
                        <input className="input" name="album" defaultValue={track.album ?? ""} />
                        <input className="input" name="durationSec" type="number" defaultValue={track.durationSec ?? ""} />
                        <input className="input" name="fileUrl" type="url" defaultValue={track.fileUrl ?? ""} />
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button className="btn secondary" type="submit">Save</button>
                      </div>
                    </form>
                  </details>
                  <form action={deleteTrackAction}>
                    <input type="hidden" name="stationId" value={station.id} />
                    <input type="hidden" name="trackId" value={track.id} />
                    <button className="btn danger" type="submit" style={{ fontSize: "0.75rem", padding: "0.4rem 0.7rem" }}>Delete</button>
                  </form>
                </div>
              </div>
            ))}
            {station.tracks.length === 0 ? <p className="muted" style={{ margin: 0 }}>No tracks yet.</p> : null}
          </div>
        </div>

        {/* Playlists */}
        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Playlists ({station.playlists.length})</h2>

          <form action={createPlaylistAction} style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem", padding: "1rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <div className="field">
              <label htmlFor="playlistName">Name</label>
              <input id="playlistName" className="input" name="name" required maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="playlistDescription">Description</label>
              <input id="playlistDescription" className="input" name="description" maxLength={200} />
            </div>
            <button className="btn primary" type="submit" style={{ justifySelf: "start" }}>Create playlist</button>
          </form>

          <div style={{ maxHeight: "500px", overflowY: "auto", display: "grid", gap: "0.75rem" }}>
            {station.playlists.map((playlist) => (
              <div key={playlist.id} style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <h3 style={{ margin: 0, fontSize: "0.95rem" }}>
                    {playlist.name}
                    {playlist.isDefault ? <span className="badge" style={{ marginLeft: "0.4rem" }}>Default</span> : null}
                  </h3>
                  <span className="muted" style={{ fontSize: "0.75rem" }}>{playlist.tracks.length} tracks</span>
                </div>

                <details>
                  <summary style={{ fontSize: "0.8rem" }}>Edit playlist</summary>
                  <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem" }}>
                    <form action={updatePlaylistAction} style={{ display: "grid", gap: "0.4rem" }}>
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="playlistId" value={playlist.id} />
                      <input className="input" name="name" required defaultValue={playlist.name} />
                      <input className="input" name="description" defaultValue={playlist.description ?? ""} />
                      <button className="btn secondary" type="submit" style={{ justifySelf: "start" }}>Save</button>
                    </form>
                  )}
                  {!pl.isDefault && (
                    <form action={deletePlaylistAction}>
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="playlistId" value={pl.id} />
                      <button className="btn btn-danger btn-sm" type="submit">Delete</button>
                    </form>
                  )}
                </div>
              </div>
              {pl.tracks.length === 0 ? (
                <p style={{ padding: "0.85rem 1.25rem", color: "var(--text-muted)", margin: 0, fontSize: "0.85rem" }}>No tracks in this playlist yet.</p>
              ) : pl.tracks.map((pt, i) => (
                <div key={pt.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 1.25rem", borderBottom: i < pl.tracks.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <span style={{ width: 24, textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pt.track.title}</p>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>{pt.track.artist}</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <form action={movePlaylistTrackAction}>
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="playlistId" value={pl.id} />
                      <input type="hidden" name="playlistTrackId" value={pt.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button className="btn btn-secondary btn-sm" disabled={i === 0} style={{ padding: "0.3rem 0.6rem" }}>↑</button>
                    </form>
                    <form action={movePlaylistTrackAction}>
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="playlistId" value={pl.id} />
                      <input type="hidden" name="playlistTrackId" value={pt.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button className="btn btn-secondary btn-sm" disabled={i === pl.tracks.length - 1} style={{ padding: "0.3rem 0.6rem" }}>↓</button>
                    </form>
                    <form action={removePlaylistTrackAction}>
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="playlistId" value={pl.id} />
                      <input type="hidden" name="playlistTrackId" value={pt.id} />
                      <button className="btn btn-danger btn-sm" type="submit" style={{ padding: "0.3rem 0.6rem" }}>✕</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Schedule */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Schedule Blocks</h2>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Define time-based programming slots. The AutoDJ will play the selected playlist during each block.
            </p>
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "var(--text-light)" }}>
              Outside scheduled blocks, Auto DJ uses your playlist marked <strong>Default</strong>. Use the <strong>Use for Auto DJ</strong> button above on any playlist to switch it.
            </p>
            <form action={addScheduleBlockAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.75rem" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Block name *</label>
                <input name="name" required maxLength={80} placeholder="e.g. Morning Show" />
              </div>
              <div className="field">
                <label>Day</label>
                <select name="dayOfWeek">
                  <option value="-1">Every day</option>
                  {[0,1,2,3,4,5,6].map((d) => <option key={d} value={d}>{DAYS[d + 1]}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Start hour (0–23)</label>
                <input name="startHour" type="number" min={0} max={23} required defaultValue={8} />
              </div>
              <div className="field">
                <label>Start min</label>
                <input name="startMin" type="number" min={0} max={59} defaultValue={0} />
              </div>
              <div className="field">
                <label>End hour (0–23)</label>
                <input name="endHour" type="number" min={0} max={23} required defaultValue={10} />
              </div>
              <div className="field">
                <label>End min</label>
                <input name="endMin" type="number" min={0} max={59} defaultValue={0} />
              </div>
              <div className="field">
                <label>Playlist</label>
                <select name="playlistId">
                  <option value="">— None —</option>
                  {station.playlists.map((pl) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button className="btn btn-primary" type="submit">Add block</button>
              </div>
            </form>
          </div>

          {station.schedules.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Block name</th>
                    <th>Day</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Playlist</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {station.schedules.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>{s.dayOfWeek === -1 ? "Every day" : DAYS[s.dayOfWeek + 1]}</td>
                      <td>{pad(s.startHour)}:{pad(s.startMin)}</td>
                      <td>{pad(s.endHour)}:{pad(s.endMin)}</td>
                      <td style={{ color: "var(--text-muted)" }}>{s.playlist?.name ?? "—"}</td>
                      <td>
                        <form action={removeScheduleBlockAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="blockId" value={s.id} />
                          <button className="btn btn-danger btn-sm" type="submit">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: TRACKS (Library view)                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === "tracks" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1rem", margin: 0 }}>Track Library ({station.tracks.length})</h2>
            </div>
            {station.tracks.length === 0 ? (
              <p style={{ padding: "1.5rem 1.25rem", color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>No tracks yet. Go to Auto DJ to upload tracks.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Album</th>
                    <th style={{ textAlign: "center" }}>Duration</th>
                    <th style={{ textAlign: "center" }}>File</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {station.tracks.map((track) => (
                    <tr key={track.id}>
                      <td style={{ fontWeight: 600 }}>{track.title}</td>
                      <td>{track.artist}</td>
                      <td style={{ color: "var(--text-muted)" }}>{track.album ?? "—"}</td>
                      <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{track.durationSec ? formatDuration(track.durationSec) : "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        {track.fileUrl || track.filePath ? (
                          <a href={track.fileUrl ?? "#"} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontSize: "0.8rem" }}>▶ Play</a>
                        ) : <span style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>No file</span>}
                      </td>
                      <td>
                        <form action={deleteTrackAction} style={{ display: "inline" }}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="trackId" value={track.id} />
                          <button className="btn btn-danger btn-sm" type="submit">Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: WIDGET (Embed player)                                */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === "widget" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Embed Widget</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Copy this iframe to embed a player on any website.
            </p>
            <div style={{ background: "var(--bg-page)", borderRadius: 10, padding: "0.85rem 1rem", border: "1px solid var(--border)" }}>
              <code style={{ fontSize: "0.82rem", wordBreak: "break-all", display: "block" }}>
                {`<iframe src="${process.env.APP_BASE_URL ?? "http://localhost:3000"}/embed/${station.slug}" width="320" height="120" frameborder="0" allow="autoplay"></iframe>`}
              </code>
            </div>
            <div style={{ marginTop: "0.75rem" }}>
              <Link href={`/embed/${station.slug}`} className="btn btn-secondary btn-sm" target="_blank">Preview widget</Link>
            </div>
          </div>

          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Direct Stream Links</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Share these URLs with listeners or use them in external players.
            </p>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              {[
                { label: "MAIN", value: streamUrl },
                { label: "M3U", value: m3uUrl },
                { label: "PLS", value: plsUrl },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.85rem", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--brand-dark)", background: "var(--brand-light)", padding: "0.15rem 0.5rem", borderRadius: 4, flexShrink: 0 }}>{label}</span>
                  <code style={{ fontSize: "0.82rem", wordBreak: "break-all", flex: 1 }}>{value}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: CTL (Control: Relays + Geo-blocking)                 */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === "ctl" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>

          {/* Relays */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Relay Streams</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Point to another Icecast or SHOUTcast stream that re-broadcasts your station content.
            </p>
            <form action={addRelayAction} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.75rem", alignItems: "end" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <div className="field">
                <label>Name *</label>
                <input name="name" required maxLength={80} placeholder="e.g. EU Relay" />
              </div>
              <div className="field">
                <label>Stream URL *</label>
                <input name="url" type="url" required placeholder="http://relay.example.com:8000/stream" />
              </div>
              <button className="btn btn-primary" type="submit">Add relay</button>
            </form>
          </div>

          {station.relayStreams.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <table className="data-table">
                <thead><tr><th>Name</th><th>URL</th><th style={{ textAlign: "center" }}>Status</th><th /></tr></thead>
                <tbody>
                  {station.relayStreams.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                        <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>{r.url}</a>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <form action={toggleRelayAction} style={{ display: "inline" }}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="relayId" value={r.id} />
                          <input type="hidden" name="isActive" value={String(r.isActive)} />
                          <button className={`btn btn-sm ${r.isActive ? "btn-primary" : "btn-secondary"}`} type="submit">
                            {r.isActive ? "Active" : "Paused"}
                          </button>
                        </form>
                      </td>
                      <td>
                        <form action={removeRelayAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="relayId" value={r.id} />
                          <button className="btn btn-danger btn-sm" type="submit">Remove</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Geo-blocking */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Geo-blocking</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Listeners from blocked countries will receive a 403 response. Use ISO 3166-1 alpha-2 codes (e.g. US, GB, FR).
            </p>
            <form action={addGeoBlockAction} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.75rem", alignItems: "end" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <div className="field">
                <label>Country code *</label>
                <input name="countryCode" required maxLength={2} placeholder="US" style={{ textTransform: "uppercase" }} />
              </div>
              <div className="field">
                <label>Country name *</label>
                <input name="countryName" required maxLength={80} placeholder="United States" />
              </div>
              <button className="btn btn-primary" type="submit">Block</button>
            </form>
          </div>

          {station.geoBlocks.length > 0 && (
            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontSize: "1rem", margin: 0 }}>Blocked Countries ({station.geoBlocks.length})</h2>
              </div>
              <table className="data-table">
                <thead><tr><th>Code</th><th>Country</th><th>Blocked since</th><th /></tr></thead>
                <tbody>
                  {station.geoBlocks.map((b) => (
                    <tr key={b.id}>
                      <td><span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.875rem" }}>{b.countryCode}</span></td>
                      <td>{b.countryName}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{b.createdAt.toLocaleDateString()}</td>
                      <td>
                        <form action={removeGeoBlockAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="countryCode" value={b.countryCode} />
                          <button className="btn btn-danger btn-sm" type="submit">Unblock</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: SETTINGS                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div style={{ display: "grid", gap: "1.25rem", maxWidth: 720 }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Station Profile</h2>
            <form action={updateStationMetadataAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.85rem" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <div className="field">
                <label>Genre</label>
                <input name="genre" defaultValue={station.genre ?? ""} placeholder="e.g. Pop, Hip-Hop, News" />
              </div>
              <div className="field">
                <label>Language</label>
                <input name="language" defaultValue={station.language} />
              </div>
              <div className="field">
                <label>Country</label>
                <input name="country" defaultValue={station.country ?? ""} placeholder="e.g. United States" />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Description</label>
                <input name="description" defaultValue={station.description ?? ""} placeholder="What does your station sound like?" />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Stream metadata description</label>
                <input name="streamDescription" defaultValue={station.streamDescription ?? ""} placeholder="Shown by some encoder clients" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 600 }}>Station Logo</p>
                <LogoUploadForm stationId={station.id} currentLogoUrl={station.logoUrl} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Logo URL</label>
                <input name="logoUrl" type="url" defaultValue={station.logoUrl ?? ""} placeholder="https://… (square image, 300x300px+)" />
                <span className="hint">Or enter a direct link to a square image. Shown on your public page and explore grid.</span>
              </div>
              <div className="field">
                <label>Website URL</label>
                <input name="websiteUrl" type="url" defaultValue={station.websiteUrl ?? ""} placeholder="https://yourstation.com" />
              </div>
              <div className="field">
                <label>Facebook URL</label>
                <input name="facebookUrl" type="url" defaultValue={station.facebookUrl ?? ""} placeholder="https://facebook.com/…" />
              </div>
              <div className="field">
                <label>Twitter / X URL</label>
                <input name="twitterUrl" type="url" defaultValue={station.twitterUrl ?? ""} placeholder="https://x.com/…" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <button className="btn btn-primary" type="submit">Save profile</button>
              </div>
            </form>
          </div>

          {/* Announcements */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Announcements</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Active announcements are shown on your public station page.
            </p>
            <form action={addAnnouncementAction} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: "0.75rem", alignItems: "end", marginBottom: "1.25rem" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <div className="field">
                <label>Title *</label>
                <input name="title" required maxLength={120} placeholder="e.g. Station update" />
              </div>
              <div className="field">
                <label>Content *</label>
                <input name="content" required maxLength={500} placeholder="Announcement message..." />
              </div>
              <button className="btn btn-primary" type="submit">Add</button>
            </form>
            {station.announcements.length > 0 && (
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {station.announcements.map((a) => (
                  <div key={a.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.75rem", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.875rem" }}>{a.title}</p>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>{a.content}</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <form action={toggleAnnouncementAction} style={{ display: "inline" }}>
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="playlistId" value={playlist.id} />
                        <button className="btn danger" type="submit" style={{ fontSize: "0.75rem" }}>Delete playlist</button>
                      </form>
                      <form action={removeAnnouncementAction} style={{ display: "inline" }}>
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="announcementId" value={a.id} />
                        <button className="btn btn-danger btn-sm" type="submit">Remove</button>
                      </form>
                    </div>
                  </div>
                </details>

                <form action={addTrackToPlaylistAction} style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
                  <input type="hidden" name="stationId" value={station.id} />
                  <input type="hidden" name="playlistId" value={playlist.id} />
                  <select name="trackId" required style={{ flex: 1 }}>
                    <option value="">Add track...</option>
                    {station.tracks.map((track) => (
                      <option key={track.id} value={track.id}>{track.artist} - {track.title}</option>
                    ))}
                  </select>
                  <button className="btn secondary" type="submit">Add</button>
                </form>

                <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.3rem" }}>
                  {playlist.tracks.map((pt, index) => (
                    <div key={pt.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", gap: "0.5rem" }}>
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: "0.8rem" }}>{pt.track.title}</strong>
                        <span className="muted" style={{ fontSize: "0.75rem", marginLeft: "0.3rem" }}>{pt.track.artist}</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.2rem", flexShrink: 0 }}>
                        <form action={movePlaylistTrackAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={pt.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button className="btn secondary" type="submit" disabled={index === 0} style={{ padding: "0.25rem 0.4rem", fontSize: "0.7rem" }}>↑</button>
                        </form>
                        <form action={movePlaylistTrackAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={pt.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button className="btn secondary" type="submit" disabled={index === playlist.tracks.length - 1} style={{ padding: "0.25rem 0.4rem", fontSize: "0.7rem" }}>↓</button>
                        </form>
                        <form action={removePlaylistTrackAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={pt.id} />
                          <button className="btn danger" type="submit" style={{ padding: "0.25rem 0.4rem", fontSize: "0.7rem" }}>x</button>
                        </form>
                      </div>
                    </div>
                  ))}
                  {playlist.tracks.length === 0 ? <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>Empty playlist.</p> : null}
                </div>
              </div>
            ))}
            {station.playlists.length === 0 ? <p className="muted">No playlists yet.</p> : null}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ padding: "1.25rem", borderColor: "rgba(239, 68, 68, 0.2)" }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "var(--danger)" }}>Danger zone</h2>
        <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>
          Permanently delete this station and all its tracks, playlists, and metrics.
        </p>
        <form action={deleteStationAction}>
          <input type="hidden" name="stationId" value={station.id} />
          <button className="btn danger" type="submit">Delete station</button>
        </form>
      </div>
    </main>
  );
}
