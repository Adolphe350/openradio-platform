import Link from "next/link";
import { StationStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { resolveStationMetric } from "@/lib/analytics";
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
  updateStationMetadataAction,
  updateStationStatusAction,
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
        include: { tracks: { orderBy: { position: "asc" }, include: { track: true } } },
      },
      geoBlocks: { orderBy: { countryName: "asc" } },
      relayStreams: { orderBy: { createdAt: "asc" } },
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
        include: { playlist: { select: { id: true, name: true } } },
      },
      announcements: { orderBy: { createdAt: "desc" } },
      recordings: { orderBy: { startedAt: "desc" }, take: 10 },
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

  const metricState = resolveStationMetric({
    stationId: station.id,
    trackCount: station.tracks.length,
    playlistCount: station.playlists.length,
    createdAt: station.createdAt,
    metric: station.metrics[0] ?? null,
  });

  const checklist = [
    { label: "Station created", done: true },
    { label: "Connect encoder", done: station.status !== StationStatus.DRAFT },
    { label: "Add tracks", done: station.tracks.length > 0 },
    { label: "Create playlist", done: station.playlists.length > 0 },
    { label: "Go live", done: station.status === StationStatus.ACTIVE },
  ];
  const checkDone = checklist.filter((c) => c.done).length;

  const isLive = station.status === StationStatus.ACTIVE;
  const activeRecording = station.recordings.find((r) => r.status === "recording");

  const navItems = [
    { id: "overview",  icon: "📻", label: station.name },
    { id: "autodj",    icon: "🎵", label: "Auto DJ" },
    { id: "tracks",    icon: "🎶", label: "Tracks" },
    { id: "widget",    icon: "📎", label: "Widget" },
    { id: "ctl",       icon: "🎛", label: "CTL" },
    { id: "settings",  icon: "⚙️", label: "Settings" },
  ];

  const gradH1 = (station.id.charCodeAt(0) * 47 + station.id.charCodeAt(1) * 31) % 360;
  const gradH2 = (gradH1 + 40) % 360;
  const grad = `linear-gradient(135deg,hsl(${gradH1},55%,48%),hsl(${gradH2},60%,35%))`;

  return (
    <div className="station-detail-layout">

      {/* ── Station Sidebar ──────────────────────────────────────── */}
      <aside className="station-sidebar">
        <div className="station-sidebar-header">
          <div style={{ width: 36, height: 36, borderRadius: 8, background: station.logoUrl ? undefined : grad, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
            {station.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={station.logoUrl} alt={station.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "📻"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="station-sidebar-name">{station.name}</p>
            <p className="station-sidebar-owner">{user.name}</p>
          </div>
        </div>

        <nav className="station-sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/stations/${stationId}?tab=${item.id}`}
              className={`station-sidebar-link${tab === item.id ? " active" : ""}`}
            >
              <span className="station-sidebar-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="station-sidebar-footer">
          <Link href="/dashboard" className="station-sidebar-link">
            <span className="station-sidebar-icon">←</span>
            Back to Dashboard
          </Link>
          <Link href={`/stations/${station.slug}`} className="station-sidebar-link">
            <span className="station-sidebar-icon">🌐</span>
            Public Page
          </Link>
          <Link href={`/dashboard/stations/${stationId}/royalties`} className="station-sidebar-link">
            <span className="station-sidebar-icon">📊</span>
            Royalties
          </Link>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="station-main">

      {error && <div className="alert alert-error" style={{ margin: "0 0 1rem" }}>{decodeURIComponent(error)}</div>}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW                                             */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>

          {/* ON AIR / OFF AIR banner */}
          <div className="card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: station.logoUrl ? undefined : grad, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                {station.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={station.logoUrl} alt={station.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "📻"}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span className={`badge ${isLive ? "badge-green" : "badge-red"}`} style={{ fontSize: "0.8rem", padding: "0.3rem 0.8rem" }}>
                    {isLive && <span className="live-dot" style={{ width: 6, height: 6, marginRight: 4 }} />}
                    {isLive ? "ON AIR" : "OFF AIR"}
                  </span>
                </div>
                <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {station.description || `${station.genre || "Radio"} station`}
                </p>
              </div>
            </div>
            <form action={updateStationStatusAction} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <select name="status" defaultValue={station.status} style={{ borderRadius: 8, padding: "0.45rem 0.7rem", fontSize: "0.875rem" }}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" type="submit">Update</button>
            </form>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "1rem" }}>
            <div className="stat-card">
              <LiveListeners stationId={station.id} initialCount={metricState.metric.currentListeners} />
            </div>
            {[
              { label: "Auto DJ", value: `${autoDjPct}%`, sub: "last 7 days" },
              { label: "Peak Listeners (all time)", value: metricState.metric.peakListeners, sub: "" },
              { label: "Listening Hours", value: `${metricState.metric.totalListeningHours.toFixed(1)}h`, sub: "" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Broadcast settings */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Broadcast settings</h2>

            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Stream URLs</h3>
            <div style={{ display: "grid", gap: "0.6rem", marginBottom: "1.5rem" }}>
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

            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Encoder Settings — Direct Icecast</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>Use these settings in RadioBoss, BUTT, OBS, or any Icecast-compatible encoder (internal network access).</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.65rem", marginBottom: "1.5rem" }}>
              {[
                { label: "Server address", value: source.host },
                { label: "Port", value: String(source.port) },
                { label: "Mount point", value: source.mountPath },
                { label: "Username", value: station.sourceUsername },
                { label: "Mount password", value: station.sourcePassword },
                { label: "Encoding", value: "MP3 or AAC" },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "0.65rem 0.85rem", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <p style={{ margin: "0 0 0.2rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                  <code style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{value}</code>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Encoder Settings — HTTPS Proxy (Port 443)</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Use these settings to connect through HTTPS port 443 — works behind corporate firewalls that block port 8000. Requires encoder to support Icecast HTTP PUT mode (BUTT 0.1.30+).
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.65rem" }}>
              {[
                { label: "Server address", value: appHost },
                { label: "Port", value: appPort },
                { label: "Mount / Path", value: `/api/source/${station.id}` },
                { label: "Username", value: station.sourceUsername },
                { label: "Mount password", value: station.sourcePassword },
                { label: "Protocol", value: "Icecast (HTTP PUT)" },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "0.65rem 0.85rem", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--brand-light)" }}>
                  <p style={{ margin: "0 0 0.2rem", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                  <code style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{value}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "0.95rem", margin: "0 0 0.85rem" }}>First broadcast checklist</h2>
            <div style={{ height: 4, background: "var(--border)", borderRadius: 999, marginBottom: "0.9rem", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(checkDone / checklist.length) * 100}%`, background: "var(--brand)", borderRadius: 999 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.6rem" }}>
              {checklist.map((c) => (
                <div key={c.label} className="checklist-item" style={{ background: c.done ? "#ecfdf5" : undefined, borderColor: c.done ? "#a7f3d0" : undefined }}>
                  <div className={`checklist-circle${c.done ? " done" : ""}`}>{c.done ? "✓" : ""}</div>
                  <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600 }}>{c.label}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Recording */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Recording</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Record your live broadcast. Recordings are logged here.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              {activeRecording ? (
                <>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem", fontWeight: 600, color: "#dc2626" }}>
                    <span className="live-dot" style={{ width: 8, height: 8, background: "#dc2626" }} />
                    Recording since {activeRecording.startedAt.toLocaleTimeString()}
                  </span>
                  <form action={stopRecordingAction} style={{ display: "inline" }}>
                    <input type="hidden" name="stationId" value={station.id} />
                    <button className="btn btn-danger btn-sm" type="submit">Stop Recording</button>
                  </form>
                </>
              ) : (
                <form action={startRecordingAction} style={{ display: "inline" }}>
                  <input type="hidden" name="stationId" value={station.id} />
                  <button className="btn btn-primary btn-sm" type="submit">Start Recording</button>
                </form>
              )}
            </div>
            {station.recordings.filter((r) => r.status === "done").length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.5rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recent Recordings</h3>
                <div style={{ display: "grid", gap: "0.4rem" }}>
                  {station.recordings.filter((r) => r.status === "done").slice(0, 5).map((r) => (
                    <div key={r.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.82rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>{r.startedAt.toLocaleString()}</span>
                      {r.endedAt && (
                        <span style={{ color: "var(--text-muted)" }}>
                          Duration: {Math.round((r.endedAt.getTime() - r.startedAt.getTime()) / 60000)}m
                        </span>
                      )}
                      {r.fileUrl && (
                        <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", marginLeft: "auto" }}>Download</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB: AUTO DJ (Playlists + Schedule + Tracks upload)        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {tab === "autodj" && (
        <div style={{ display: "grid", gap: "1.25rem" }}>

          {/* Upload form */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.2rem" }}>Upload Audio File</h2>
            <UploadTrackForm stationId={station.id} />
          </div>

          {/* Add by URL */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.2rem" }}>Add Track by URL</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>Link to an external audio file or enter metadata only</p>
            <form action={createTrackAction} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.75rem" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <div className="field">
                <label htmlFor="title">Title *</label>
                <input id="title" name="title" required maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="artist">Artist *</label>
                <input id="artist" name="artist" required maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="album">Album</label>
                <input id="album" name="album" maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="durationSec">Duration (sec)</label>
                <input id="durationSec" name="durationSec" type="number" min={1} />
              </div>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="fileUrl">File URL</label>
                <input id="fileUrl" name="fileUrl" type="url" placeholder="https://..." />
              </div>
              <div>
                <button className="btn btn-primary" type="submit">Add track</button>
              </div>
            </form>
          </div>

          {/* Playlists */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Playlists</h2>
            <form action={createPlaylistAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
              <input type="hidden" name="stationId" value={station.id} />
              <div className="field">
                <label>Name *</label>
                <input name="name" required maxLength={80} placeholder="e.g. Morning Mix" />
              </div>
              <div className="field">
                <label>Description</label>
                <input name="description" maxLength={200} placeholder="Optional" />
              </div>
              <button className="btn btn-primary" type="submit">Create</button>
            </form>
          </div>

          {station.playlists.map((pl) => (
            <div key={pl.id} className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "0.975rem" }}>{pl.name} {pl.isDefault && <span style={{ fontSize: "0.7rem", background: "var(--brand-light)", color: "var(--brand-dark)", padding: "0.1rem 0.5rem", borderRadius: 999, marginLeft: 6 }}>Default</span>}</h3>
                  {pl.description && <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{pl.description}</p>}
                </div>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <form action={addTrackToPlaylistAction} style={{ display: "flex", gap: "0.4rem" }}>
                    <input type="hidden" name="stationId" value={station.id} />
                    <input type="hidden" name="playlistId" value={pl.id} />
                    <select name="trackId" required style={{ borderRadius: 8, padding: "0.35rem 0.6rem", fontSize: "0.82rem" }}>
                      <option value="">Add track…</option>
                      {station.tracks.map((t) => <option key={t.id} value={t.id}>{t.artist} – {t.title}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" type="submit">Add</button>
                  </form>
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
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Define time-based programming slots. The AutoDJ will play the selected playlist during each block.
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
                        <input type="hidden" name="announcementId" value={a.id} />
                        <input type="hidden" name="active" value={String(a.active)} />
                        <button className={`btn btn-sm ${a.active ? "btn-primary" : "btn-secondary"}`} type="submit">
                          {a.active ? "Active" : "Hidden"}
                        </button>
                      </form>
                      <form action={removeAnnouncementAction} style={{ display: "inline" }}>
                        <input type="hidden" name="stationId" value={station.id} />
                        <input type="hidden" name="announcementId" value={a.id} />
                        <button className="btn btn-danger btn-sm" type="submit">Remove</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.3rem", color: "#dc2626" }}>Danger Zone</h2>
            <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
              Permanently delete this station and all its data. This cannot be undone.
            </p>
            <form action={deleteStationAction}>
              <input type="hidden" name="stationId" value={station.id} />
              <button className="btn btn-danger" type="submit">Delete station</button>
            </form>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}
