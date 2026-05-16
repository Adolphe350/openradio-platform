import Link from "next/link";
import { StationStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { metricSourceLabel, resolveStationMetric } from "@/lib/analytics";
import { db } from "@/lib/db";
import { getPublicStreamUrl, getSourceEndpoint } from "@/lib/stream";
import { fallbackValue, formatDuration } from "@/lib/utils";

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

type StationDetailPageProps = {
  params: Promise<{ stationId: string }>;
  searchParams: Promise<{ error?: string }>;
};

const statusOptions: StationStatus[] = ["DRAFT", "ACTIVE", "PAUSED"];

export default async function StationDetailPage({ params, searchParams }: StationDetailPageProps) {
  const user = await requireUser();
  const { stationId } = await params;
  const { error } = await searchParams;

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
  const publicStreamUrl = getPublicStreamUrl(station.mountPath);

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
            &larr; Back to stations
          </Link>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem" }}>{station.name}</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            /{station.slug} &middot; {station.status}
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
                <input id="album" className="input" name="album" maxLength={120} />
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
                    {!playlist.isDefault ? (
                      <form action={deletePlaylistAction}>
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="playlistId" value={playlist.id} />
                        <button className="btn danger" type="submit" style={{ fontSize: "0.75rem" }}>Delete playlist</button>
                      </form>
                    ) : null}
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
                          <button className="btn secondary" type="submit" disabled={index === 0} style={{ padding: "0.25rem 0.4rem", fontSize: "0.7rem" }}>&uarr;</button>
                        </form>
                        <form action={movePlaylistTrackAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={pt.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button className="btn secondary" type="submit" disabled={index === playlist.tracks.length - 1} style={{ padding: "0.25rem 0.4rem", fontSize: "0.7rem" }}>&darr;</button>
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
