import Link from "next/link";

import { UploadTrackForm } from "@/components/upload-track-form";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/utils";

import {
  addMusicTrackAction,
  addTrackToPlaylistMusicAction,
  createMusicPlaylistAction,
  deleteMusicPlaylistAction,
  deleteMusicTrackAction,
  removeTrackFromPlaylistMusicAction,
} from "./actions";

export const metadata = { title: "Music Library – OpenRadio" };

type Props = {
  searchParams: Promise<{ stationId?: string; error?: string; success?: string }>;
};

export default async function MusicPage({ searchParams }: Props) {
  const user = await requireUser();
  const { stationId: selectedStationId, error, success } = await searchParams;

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      _count: { select: { tracks: true, playlists: true } },
      tracks: { orderBy: { createdAt: "desc" }, take: 200 },
      playlists: {
        orderBy: { createdAt: "asc" },
        include: {
          tracks: {
            orderBy: { position: "asc" },
            include: {
              track: {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                },
              },
            },
            take: 30,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (stations.length === 0) {
    return (
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h1 className="dash-page-title">Music Library</h1>
            <p className="dash-page-sub">Upload tracks and build playlists for your studio and AutoDJ.</p>
          </div>
          <Link href="/dashboard/stations/new" className="btn btn-primary">
            + Create Station
          </Link>
        </div>

        <div className="card empty-state">
          <span className="empty-icon">🎵</span>
          <h3 style={{ margin: 0 }}>Create a station first</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "40ch" }}>
            Music management is station-scoped. Create your first station, then upload beds and tracks here.
          </p>
          <Link href="/dashboard/stations/new" className="btn btn-primary">Create station</Link>
        </div>
      </div>
    );
  }

  const station =
    stations.find((candidate) => candidate.id === selectedStationId) ??
    stations[0];

  const successMessage =
    success === "track-added"
      ? "Track added."
      : success === "track-deleted"
        ? "Track removed."
        : success === "playlist-created"
          ? "Playlist created."
          : success === "playlist-deleted"
            ? "Playlist deleted."
            : success === "track-added-to-playlist"
              ? "Track added to playlist."
              : success === "playlist-track-removed"
                ? "Track removed from playlist."
                : "";

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Music Library</h1>
          <p className="dash-page-sub">Manage uploaded tracks, music beds, and playlists used by Studio and AutoDJ.</p>
        </div>
        <div className="mobile-full-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href={`/dashboard/studio?stationId=${station.id}`} className="btn btn-secondary">Open Studio</Link>
          <Link href={`/dashboard/stations/${station.id}?tab=tracks`} className="btn btn-primary">Station Tracks</Link>
        </div>
      </div>

      <div className="card" style={{ padding: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {stations.map((entry) => {
          const active = entry.id === station.id;
          return (
            <Link
              key={entry.id}
              href={`/dashboard/music?stationId=${entry.id}`}
              className={`btn ${active ? "btn-primary" : "btn-secondary"} btn-sm`}
              style={{ minWidth: 160, justifyContent: "space-between" }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</span>
              <span style={{ fontSize: "0.74rem", opacity: 0.8 }}>{entry._count.tracks}</span>
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="alert alert-error">{decodeURIComponent(error)}</div>
      )}
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}

      <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1rem" }}>
        <div id="upload" className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Upload Music</h2>
          <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.84rem" }}>
            Upload MP3/WAV/FLAC files for Studio background beds and AutoDJ rotations.
          </p>
          <UploadTrackForm stationId={station.id} />
        </div>

        <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "0.9rem" }}>
          <div>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Add Bed by URL</h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
              Use this when your music bed is hosted externally.
            </p>
          </div>

          <form action={addMusicTrackAction} style={{ display: "grid", gap: "0.75rem" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <div className="field">
              <label>Title *</label>
              <input name="title" required maxLength={120} placeholder="Morning Bed" />
            </div>
            <div className="field">
              <label>Artist *</label>
              <input name="artist" required maxLength={120} placeholder="OpenRadio Studio" />
            </div>
            <div className="field">
              <label>Album</label>
              <input name="album" maxLength={120} placeholder="Optional" />
            </div>
            <div className="field">
              <label>Duration (sec)</label>
              <input name="durationSec" type="number" min={1} placeholder="120" />
            </div>
            <div className="field">
              <label>Audio URL</label>
              <input name="fileUrl" type="url" placeholder="https://..." />
            </div>
            <button className="btn btn-primary" type="submit">Add track</button>
          </form>

          <div style={{ fontSize: "0.77rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "0.8rem" }}>
            Tip: create a playlist named <strong>Music Beds</strong> to keep Studio background tracks organized.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: "1.25rem", overflow: "hidden" }}>
        <div className="section-row" style={{ marginBottom: "0.8rem" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Track Library ({station.tracks.length})</h2>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{station.playlists.length} playlists</span>
        </div>

        {station.tracks.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
            No tracks yet. Upload above to start building your music bed and broadcast library.
          </p>
        ) : (
          <div className="table-scroll">
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Track</th>
                  <th>Duration</th>
                  <th>Source</th>
                  <th>Add to playlist</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {station.tracks.map((track) => (
                  <tr key={track.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{track.title}</div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{track.artist}</div>
                    </td>
                    <td>{track.durationSec ? formatDuration(track.durationSec) : "—"}</td>
                    <td>
                      {track.fileUrl || track.filePath ? (
                        <a href={`/api/audio/${track.id}`} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontWeight: 600 }}>
                          Preview
                        </a>
                      ) : (
                        <span style={{ color: "var(--text-light)", fontSize: "0.8rem" }}>Metadata only</span>
                      )}
                    </td>
                    <td>
                      <form action={addTrackToPlaylistMusicAction} style={{ display: "flex", gap: "0.35rem", minWidth: 220 }}>
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="trackId" value={track.id} />
                        <select name="playlistId" defaultValue={station.playlists[0]?.id ?? ""}>
                          {station.playlists.map((playlist) => (
                            <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
                          ))}
                        </select>
                        <button className="btn btn-secondary btn-sm" type="submit">Add</button>
                      </form>
                    </td>
                    <td>
                      <form action={deleteMusicTrackAction}>
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="trackId" value={track.id} />
                        <button className="btn btn-danger btn-sm" type="submit">Delete</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="card" style={{ padding: "1.25rem" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.85rem" }}>Create Playlist</h2>
          <form action={createMusicPlaylistAction} style={{ display: "grid", gap: "0.75rem" }}>
            <input type="hidden" name="stationId" value={station.id} />
            <div className="field">
              <label>Name *</label>
              <input name="name" required maxLength={80} placeholder="Music Beds" />
            </div>
            <div className="field">
              <label>Description</label>
              <input name="description" maxLength={180} placeholder="Optional" />
            </div>
            <button className="btn btn-primary" type="submit">Create playlist</button>
          </form>
        </div>

        <div className="card" style={{ padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Playlists</h2>
          {station.playlists.length === 0 ? (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>No playlists yet.</p>
          ) : (
            station.playlists.map((playlist) => (
              <div key={playlist.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "0.75rem", display: "grid", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>
                      {playlist.name} {playlist.isDefault && <span style={{ fontSize: "0.7rem", color: "var(--brand-dark)", background: "var(--brand-light)", padding: "0.1rem 0.4rem", borderRadius: 999 }}>Default</span>}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>{playlist.tracks.length} tracks</div>
                  </div>
                  {!playlist.isDefault && (
                    <form action={deleteMusicPlaylistAction}>
                      <input type="hidden" name="stationId" value={station.id} />
                      <input type="hidden" name="playlistId" value={playlist.id} />
                      <button className="btn btn-danger btn-sm" type="submit">Delete</button>
                    </form>
                  )}
                </div>

                {playlist.tracks.length > 0 ? (
                  <div style={{ display: "grid", gap: "0.35rem" }}>
                    {playlist.tracks.slice(0, 8).map((playlistTrack) => (
                      <div key={playlistTrack.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "center", fontSize: "0.8rem" }}>
                        <span style={{ color: "var(--text-muted)", minWidth: 18 }}>{playlistTrack.position}.</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {playlistTrack.track.artist} — {playlistTrack.track.title}
                        </span>
                        <form action={removeTrackFromPlaylistMusicAction}>
                          <input type="hidden" name="stationId" value={station.id} />
                          <input type="hidden" name="playlistId" value={playlist.id} />
                          <input type="hidden" name="playlistTrackId" value={playlistTrack.id} />
                          <button className="btn btn-secondary btn-sm" type="submit" style={{ padding: "0.25rem 0.45rem" }}>
                            Remove
                          </button>
                        </form>
                      </div>
                    ))}
                    {playlist.tracks.length > 8 && (
                      <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-light)" }}>
                        +{playlist.tracks.length - 8} more track{playlist.tracks.length - 8 === 1 ? "" : "s"}
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-light)" }}>No tracks in this playlist yet.</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
