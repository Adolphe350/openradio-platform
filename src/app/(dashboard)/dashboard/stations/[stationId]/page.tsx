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
  updatePlaylistAction,
  updateStationMetadataAction,
  updateStationStatusAction,
  updateTrackAction
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
    where: {
      id: stationId,
      ownerId: user.id
    },
    include: {
      metrics: {
        orderBy: { sampledAt: "desc" },
        take: 1
      },
      tracks: {
        orderBy: { createdAt: "desc" }
      },
      playlists: {
        orderBy: { createdAt: "asc" },
        include: {
          tracks: {
            orderBy: { position: "asc" },
            include: {
              track: true
            }
          }
        }
      }
    }
  });

  if (!station) {
    notFound();
  }

  const source = getSourceEndpoint(station.mountPath);
  const publicStreamUrl = getPublicStreamUrl(station.mountPath);

  const metricState = resolveStationMetric({
    stationId: station.id,
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
          sampledAt: station.metrics[0].sampledAt
        }
      : null
  });

  const analytics = [
    {
      label: "Current listeners",
      value: metricState.metric.currentListeners.toString(),
      state: metricSourceLabel(metricState.source),
      hint: metricState.source === "live" ? "Listener metric sample" : "Seeded sample until live ingestion"
    },
    {
      label: "Peak listeners",
      value: metricState.metric.peakListeners.toString(),
      state: metricSourceLabel(metricState.source),
      hint: metricState.source === "live" ? "Latest peak sample" : "Seeded sample until live ingestion"
    },
    {
      label: "Total listening hours",
      value: metricState.metric.totalListeningHours.toFixed(1),
      state: metricSourceLabel(metricState.source),
      hint: metricState.source === "live" ? "Aggregated sample" : "Seeded sample until live ingestion"
    },
    {
      label: "Uptime",
      value: `${metricState.metric.uptimePercent.toFixed(1)}%`,
      state: metricSourceLabel(metricState.source),
      hint: metricState.source === "live" ? "Recent sample window" : "Seeded sample until live ingestion"
    },
    {
      label: "Storage used",
      value: `${metricState.metric.storageUsedMb.toFixed(0)} MB`,
      state: metricSourceLabel(metricState.source),
      hint: metricState.source === "live" ? "Track storage sample" : "Seeded estimate from library metadata"
    },
    {
      label: "Top listener countries",
      value: "Planned",
      state: "Planned",
      hint: "Geo analytics pipeline is not implemented in this MVP"
    }
  ];

  const firstBroadcastChecklist = [
    {
      label: "Create station",
      done: true,
      detail: "Station created and studio access enabled"
    },
    {
      label: "Connect encoder",
      done: station.status !== StationStatus.DRAFT,
      detail: station.status !== StationStatus.DRAFT ? "Station status indicates encoder setup is in progress/live" : "Switch status to ACTIVE once encoder is connected"
    },
    {
      label: "Add track",
      done: station.tracks.length > 0,
      detail: station.tracks.length > 0 ? `${station.tracks.length} tracks in library` : "Add at least one track metadata entry"
    },
    {
      label: "Create playlist",
      done: station.playlists.length > 0,
      detail: station.playlists.length > 0 ? `${station.playlists.length} playlists configured` : "Create your first playlist"
    },
    {
      label: "Publish and share page",
      done: station.status === StationStatus.ACTIVE,
      detail: station.status === StationStatus.ACTIVE ? "Public page is ready to share" : "Set station status to ACTIVE"
    }
  ];

  const completedChecklistCount = firstBroadcastChecklist.filter((item) => item.done).length;

  const diagnostics = [
    {
      label: "Station lifecycle",
      state: "Live",
      detail: `Current status: ${station.status}`
    },
    {
      label: "Encoder credential pack",
      state: "Live",
      detail: "Host, port, mount path, username, and source password are generated."
    },
    {
      label: "Stream ingest probes",
      state: "Planned",
      detail: "Automated Icecast ingest health checks are planned; validate manually in MVP."
    },
    {
      label: "AutoDJ worker diagnostics",
      state: "Planned",
      detail: "Per-station worker telemetry is planned while baseline Liquidsoap mode is active."
    }
  ];

  return (
    <main className="container" style={{ width: "100%", margin: 0, padding: "0.5rem 0 2rem", display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <span className="badge">Station studio</span>
          <h1 style={{ margin: "0.5rem 0 0.2rem" }}>{station.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Slug: <code>{station.slug}</code> · Status: <strong>{station.status}</strong>
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <Link href="/dashboard" className="btn secondary">
            Back to stations
          </Link>
          <Link href={`/stations/${station.slug}`} className="btn secondary">
            Public page
          </Link>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <section className="card" style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <h2 style={{ marginBottom: "0.25rem" }}>First broadcast checklist</h2>
            <p className="muted" style={{ margin: 0 }}>
              {completedChecklistCount}/{firstBroadcastChecklist.length} steps complete.
            </p>
          </div>

          <form action={updateStationStatusAction} style={{ display: "flex", gap: "0.45rem", alignItems: "center", flexWrap: "wrap" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <label htmlFor="status" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Station status
            </label>
            <select id="status" name="status" defaultValue={station.status}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button className="btn secondary" type="submit">
              Update status
            </button>
          </form>
        </div>

        <div className="grid" style={{ marginTop: "0.8rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.65rem" }}>
          {firstBroadcastChecklist.map((item) => (
            <article key={item.label} className="card" style={{ padding: "0.75rem" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>{item.done ? "[x]" : "[ ]"} {item.label}</p>
              <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.8rem" }}>
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {analytics.map((item) => (
          <article key={item.label} className="card" style={{ padding: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
                {item.label}
              </p>
              <span className="badge">{item.state}</span>
            </div>
            <strong style={{ fontSize: "1.45rem" }}>{item.value}</strong>
            <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.78rem" }}>
              {item.hint}
            </p>
          </article>
        ))}
      </section>

      <section className="card" style={{ padding: "1rem" }}>
        <h2 style={{ marginBottom: "0.4rem" }}>Stream diagnostics</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Diagnostics are explicit about what is live in the MVP versus planned for later parity phases.
        </p>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem" }}>
          {diagnostics.map((item) => (
            <article key={item.label} className="card" style={{ padding: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "0.98rem" }}>{item.label}</h3>
                <span className="badge">{item.state}</span>
              </div>
              <p className="muted" style={{ margin: "0.3rem 0 0", fontSize: "0.82rem" }}>
                {item.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: "1rem" }}>
        <h2 style={{ marginBottom: "0.4rem" }}>Live source connection (Icecast compatible)</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Use these settings in RadioBOSS, BUTT, Mixxx, Liquidsoap, or any Icecast-compatible encoder.
        </p>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.65rem" }}>
          <article className="card" style={{ padding: "0.75rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.77rem" }}>Host</p>
            <code>{source.host}</code>
          </article>
          <article className="card" style={{ padding: "0.75rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.77rem" }}>Port</p>
            <code>{source.port}</code>
          </article>
          <article className="card" style={{ padding: "0.75rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.77rem" }}>Mount</p>
            <code>{source.mountPath}</code>
          </article>
          <article className="card" style={{ padding: "0.75rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.77rem" }}>Source username</p>
            <code>{station.sourceUsername}</code>
          </article>
          <article className="card" style={{ padding: "0.75rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.77rem" }}>Source password</p>
            <code>{station.sourcePassword}</code>
          </article>
          <article className="card" style={{ padding: "0.75rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.77rem" }}>Public stream URL</p>
            <code>{publicStreamUrl}</code>
          </article>
        </div>
        <p className="muted" style={{ marginBottom: 0, marginTop: "0.7rem" }}>
          Encoder URL format: <code>{source.sourceUrl}</code>
        </p>
      </section>

      <section className="card" style={{ padding: "1rem" }}>
        <h2 style={{ marginBottom: "0.4rem" }}>Station metadata</h2>
        <form action={updateStationMetadataAction} className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <input type="hidden" name="stationId" value={station.id} />
          <div className="field">
            <label htmlFor="genre">Genre</label>
            <input id="genre" name="genre" className="input" defaultValue={station.genre ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" name="description" className="input" defaultValue={station.description ?? ""} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="streamDescription">Stream metadata description</label>
            <input
              id="streamDescription"
              name="streamDescription"
              className="input"
              defaultValue={station.streamDescription ?? ""}
              placeholder="Optional text shown by some players"
            />
          </div>
          <div>
            <button className="btn primary" type="submit">
              Save metadata
            </button>
          </div>
        </form>
      </section>

      <section className="station-split">
        <article className="card" style={{ padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.45rem" }}>AutoDJ tracks</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            MVP metadata storage for tracks. Replace <code>fileUrl</code> with storage integration in a future phase.
          </p>

          <form action={createTrackAction} className="grid" style={{ marginBottom: "1rem" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" className="input" name="title" required maxLength={120} />
            </div>
            <div className="field">
              <label htmlFor="artist">Artist</label>
              <input id="artist" className="input" name="artist" required maxLength={120} />
            </div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="field">
                <label htmlFor="album">Album</label>
                <input id="album" className="input" name="album" maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="durationSec">Duration (seconds)</label>
                <input id="durationSec" className="input" name="durationSec" type="number" min={1} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="fileUrl">File URL</label>
              <input id="fileUrl" className="input" name="fileUrl" placeholder="https://..." type="url" />
            </div>
            <button className="btn primary" type="submit">
              Add track
            </button>
          </form>

          <div style={{ maxHeight: "440px", overflowY: "auto", borderTop: "1px solid #e2e8f0", paddingTop: "0.7rem" }}>
            {station.tracks.map((track) => (
              <article key={track.id} className="card" style={{ padding: "0.7rem", marginBottom: "0.55rem" }}>
                <strong>{track.title}</strong>
                <p className="muted" style={{ margin: "0.2rem 0" }}>
                  {track.artist} · {fallbackValue(track.album)} · {formatDuration(track.durationSec)}
                </p>
                {track.fileUrl ? (
                  <p style={{ margin: "0.15rem 0", fontSize: "0.8rem" }}>
                    <a href={track.fileUrl} target="_blank" rel="noreferrer">
                      {track.fileUrl}
                    </a>
                  </p>
                ) : null}

                <details style={{ marginTop: "0.45rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Edit track</summary>
                  <form action={updateTrackAction} className="grid" style={{ marginTop: "0.5rem" }}>
                    <input type="hidden" name="stationId" value={station.id} />
                    <input type="hidden" name="trackId" value={track.id} />
                    <div className="field">
                      <label htmlFor={`title-${track.id}`}>Title</label>
                      <input id={`title-${track.id}`} className="input" name="title" defaultValue={track.title} required maxLength={120} />
                    </div>
                    <div className="field">
                      <label htmlFor={`artist-${track.id}`}>Artist</label>
                      <input id={`artist-${track.id}`} className="input" name="artist" defaultValue={track.artist} required maxLength={120} />
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                      <div className="field">
                        <label htmlFor={`album-${track.id}`}>Album</label>
                        <input id={`album-${track.id}`} className="input" name="album" defaultValue={track.album ?? ""} maxLength={120} />
                      </div>
                      <div className="field">
                        <label htmlFor={`duration-${track.id}`}>Duration (seconds)</label>
                        <input
                          id={`duration-${track.id}`}
                          className="input"
                          name="durationSec"
                          type="number"
                          min={1}
                          defaultValue={track.durationSec ?? ""}
                        />
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`file-${track.id}`}>File URL</label>
                      <input id={`file-${track.id}`} className="input" name="fileUrl" type="url" defaultValue={track.fileUrl ?? ""} />
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button className="btn secondary" type="submit">
                        Save track
                      </button>
                    </div>
                  </form>
                </details>

                <form action={deleteTrackAction} style={{ marginTop: "0.55rem" }}>
                  <input type="hidden" name="stationId" value={station.id} />
                  <input type="hidden" name="trackId" value={track.id} />
                  <button className="btn secondary" type="submit" style={{ borderColor: "#fecaca", color: "#b91c1c" }}>
                    Delete track
                  </button>
                </form>
              </article>
            ))}
            {station.tracks.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                No tracks yet.
              </p>
            ) : null}
          </div>
        </article>

        <article className="card" style={{ padding: "1rem" }}>
          <h2 style={{ marginBottom: "0.45rem" }}>Playlists</h2>
          <form action={createPlaylistAction} className="grid" style={{ marginBottom: "1rem" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <div className="field">
              <label htmlFor="playlistName">Playlist name</label>
              <input id="playlistName" className="input" name="name" required maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="playlistDescription">Description</label>
              <input id="playlistDescription" className="input" name="description" maxLength={200} />
            </div>
            <button className="btn primary" type="submit">
              Create playlist
            </button>
          </form>

          <div style={{ display: "grid", gap: "0.8rem", maxHeight: "590px", overflowY: "auto" }}>
            {station.playlists.map((playlist) => (
              <article key={playlist.id} className="card" style={{ padding: "0.8rem" }}>
                <h3 style={{ marginBottom: "0.2rem", fontSize: "1rem" }}>
                  {playlist.name} {playlist.isDefault ? <span className="badge">Default</span> : null}
                </h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {playlist.description ?? "No description"}
                </p>

                <details style={{ marginBottom: "0.7rem" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Edit playlist</summary>
                  <div className="grid" style={{ marginTop: "0.5rem", gap: "0.45rem" }}>
                    <form action={updatePlaylistAction} className="grid">
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="playlistId" value={playlist.id} />
                      <div className="field">
                        <label htmlFor={`playlist-name-${playlist.id}`}>Playlist name</label>
                        <input
                          id={`playlist-name-${playlist.id}`}
                          className="input"
                          name="name"
                          required
                          maxLength={80}
                          defaultValue={playlist.name}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`playlist-description-${playlist.id}`}>Description</label>
                        <input
                          id={`playlist-description-${playlist.id}`}
                          className="input"
                          name="description"
                          maxLength={200}
                          defaultValue={playlist.description ?? ""}
                        />
                      </div>
                      <div>
                        <button className="btn secondary" type="submit">
                          Save playlist
                        </button>
                      </div>
                    </form>
                    {!playlist.isDefault ? (
                      <form action={deletePlaylistAction}>
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="playlistId" value={playlist.id} />
                        <button className="btn secondary" type="submit" style={{ borderColor: "#fecaca", color: "#b91c1c" }}>
                          Delete playlist
                        </button>
                      </form>
                    ) : null}
                  </div>
                </details>

                <form action={addTrackToPlaylistAction} className="grid" style={{ gridTemplateColumns: "1fr auto" }}>
                  <input type="hidden" name="stationId" value={station.id} />
                  <input type="hidden" name="playlistId" value={playlist.id} />
                  <select name="trackId" required>
                    <option value="">Select track</option>
                    {station.tracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        {track.artist} - {track.title}
                      </option>
                    ))}
                  </select>
                  <button className="btn secondary" type="submit">
                    Add
                  </button>
                </form>

                <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.45rem" }}>
                  {playlist.tracks.map((playlistTrack, index) => (
                    <article
                      key={playlistTrack.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.55rem",
                        border: "1px solid #dbe3ed",
                        borderRadius: "10px",
                        background: "#fff"
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.93rem" }}>{playlistTrack.track.title}</strong>
                        <p className="muted" style={{ margin: 0, fontSize: "0.84rem" }}>
                          {playlistTrack.track.artist}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <form action={movePlaylistTrackAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={playlistTrack.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button className="btn secondary" type="submit" disabled={index === 0}>
                            ↑
                          </button>
                        </form>
                        <form action={movePlaylistTrackAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={playlistTrack.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button className="btn secondary" type="submit" disabled={index === playlist.tracks.length - 1}>
                            ↓
                          </button>
                        </form>
                        <form action={removePlaylistTrackAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={playlistTrack.id} />
                          <button className="btn secondary" type="submit" style={{ borderColor: "#fecaca", color: "#b91c1c" }}>
                            Remove
                          </button>
                        </form>
                      </div>
                    </article>
                  ))}

                  {playlist.tracks.length === 0 ? <p className="muted">No tracks in this playlist yet.</p> : null}
                </div>
              </article>
            ))}

            {station.playlists.length === 0 ? <p className="muted">No playlists yet.</p> : null}
          </div>
        </article>
      </section>

      <section className="card" style={{ padding: "1rem" }}>
        <h2 style={{ marginBottom: "0.35rem", color: "#b91c1c" }}>Danger zone</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Delete the station and all associated tracks, playlists, and metrics.
        </p>
        <form action={deleteStationAction}>
          <input type="hidden" name="stationId" value={station.id} />
          <button className="btn secondary" type="submit" style={{ borderColor: "#fecaca", color: "#b91c1c" }}>
            Delete station
          </button>
        </form>
      </section>
    </main>
  );
}
