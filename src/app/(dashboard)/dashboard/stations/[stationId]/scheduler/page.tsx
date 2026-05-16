import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SchedulerGrid } from "./scheduler-grid";

type Props = {
  params: Promise<{ stationId: string }>;
};

export default async function SchedulerPage({ params }: Props) {
  const user = await requireUser();
  const { stationId } = await params;

  const station = await db.station.findFirst({
    where: { id: stationId, ownerId: user.id },
    include: {
      schedules: {
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }, { startMin: "asc" }],
        include: { playlist: { select: { id: true, name: true } } },
      },
      playlists: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { tracks: true } },
        },
      },
      tracks: {
        orderBy: { title: "asc" },
        select: { id: true, title: true, artist: true, durationSec: true },
      },
      recordings: {
        where: { status: "done" },
        orderBy: { startedAt: "desc" },
        take: 50,
        select: { id: true, startedAt: true, fileUrl: true, filePath: true, sizeBytes: true },
      },
    },
  });

  if (!station) notFound();

  // Gather podcast episodes for this station's owner
  const podcasts = await db.podcast.findMany({
    where: { ownerId: user.id },
    include: {
      episodes: {
        orderBy: { publishedAt: "desc" },
        take: 100,
        select: { id: true, title: true, durationSec: true, publishedAt: true },
      },
    },
    orderBy: { title: "asc" },
  });

  const gradH1 = (station.id.charCodeAt(0) * 47 + station.id.charCodeAt(1) * 31) % 360;
  const gradH2 = (gradH1 + 40) % 360;
  const grad = `linear-gradient(135deg,hsl(${gradH1},55%,48%),hsl(${gradH2},60%,35%))`;

  return (
    <div className="station-detail-layout">
      {/* ── Station Sidebar ─────────────────────────────────── */}
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
          <Link
            href={`/dashboard/stations/${stationId}?tab=overview`}
            className="station-sidebar-link"
          >
            <span className="station-sidebar-icon">📻</span>
            {station.name}
          </Link>
          <Link
            href={`/dashboard/stations/${stationId}?tab=autodj`}
            className="station-sidebar-link"
          >
            <span className="station-sidebar-icon">🎵</span>
            Auto DJ
          </Link>
          <Link
            href={`/dashboard/stations/${stationId}/scheduler`}
            className="station-sidebar-link active"
          >
            <span className="station-sidebar-icon">📅</span>
            Scheduler
          </Link>
          <Link
            href={`/dashboard/stations/${stationId}?tab=tracks`}
            className="station-sidebar-link"
          >
            <span className="station-sidebar-icon">🎶</span>
            Tracks
          </Link>
          <Link
            href={`/dashboard/stations/${stationId}?tab=settings`}
            className="station-sidebar-link"
          >
            <span className="station-sidebar-icon">⚙️</span>
            Settings
          </Link>
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

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="station-main">
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>AutoDJ Scheduler</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0.3rem 0 0" }}>
            Plan your weekly programming. When no block is active, AutoDJ plays all tracks randomly.
          </p>
        </div>

        <SchedulerGrid
          stationId={stationId}
          schedules={station.schedules.map((s) => ({
            id: s.id,
            name: s.name,
            dayOfWeek: s.dayOfWeek,
            startHour: s.startHour,
            startMin: s.startMin,
            endHour: s.endHour,
            endMin: s.endMin,
            sourceType: s.sourceType,
            sourceId: s.sourceId,
            playlistId: s.playlistId,
            color: s.color,
            notes: s.notes,
            isActive: s.isActive,
            playlistName: s.playlist?.name ?? null,
          }))}
          playlists={station.playlists.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? undefined,
            trackCount: p._count.tracks,
          }))}
          tracks={station.tracks.map((t) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            durationSec: t.durationSec ?? undefined,
          }))}
          recordings={station.recordings.map((r) => ({
            id: r.id,
            label: `Recording ${r.startedAt.toLocaleDateString()}`,
            date: r.startedAt.toLocaleDateString(),
            hasFile: !!(r.fileUrl || r.filePath),
          }))}
          episodes={podcasts.flatMap((p) =>
            p.episodes.map((e) => ({
              id: e.id,
              title: e.title,
              podcastTitle: p.title,
              durationSec: e.durationSec ?? undefined,
            }))
          )}
        />
      </main>
    </div>
  );
}
