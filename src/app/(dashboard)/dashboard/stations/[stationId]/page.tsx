import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPublicStreamUrl, getSourceEndpoint } from "@/lib/stream";
import { fallbackValue, formatDuration } from "@/lib/utils";

import {
  addTrackToPlaylistAction,
  createPlaylistAction,
  createTrackAction,
  deleteStationAction,
  movePlaylistTrackAction,
  updateStationMetadataAction
} from "../../actions";

type StationDetailPageProps = {
  params: Promise<{ stationId: string }>;
  searchParams: Promise<{ error?: string }>;
};

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
  const latestMetric = station.metrics[0];

  const analytics = [
    {
      label: "Current listeners",
      value: latestMetric?.currentListeners ?? "--"
    },
    {
      label: "Peak listeners",
      value: latestMetric?.peakListeners ?? "--"
    },
    {
      label: "Total listening hours",
      value: latestMetric ? latestMetric.totalListeningHours.toFixed(1) : "--"
    },
    {
      label: "Uptime",
      value: latestMetric ? `${latestMetric.uptimePercent.toFixed(1)}%` : "--"
    },
    {
      label: "Storage used",
      value: latestMetric ? `${latestMetric.storageUsedMb.toFixed(0)} MB` : "--"
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

      <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
        {analytics.map((item) => (
          <article key={item.label} className="card" style={{ padding: "0.9rem" }}>
            <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
              {item.label}
            </p>
            <strong style={{ fontSize: "1.45rem" }}>{item.value}</strong>
          </article>
        ))}
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
            MVP metadata storage for tracks. Replace `fileUrl` with storage integration in a future phase.
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
                  <p style={{ margin: 0, fontSize: "0.8rem" }}>
                    <a href={track.fileUrl} target="_blank" rel="noreferrer">
                      {track.fileUrl}
                    </a>
                  </p>
                ) : null}
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
                      <div style={{ display: "flex", gap: "0.35rem" }}>
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
