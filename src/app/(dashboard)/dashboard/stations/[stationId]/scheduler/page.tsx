import { StationHeader } from "@/components/station-header";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stationTimezoneLabel } from "@/lib/timezones";
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

  return (
    <div className="station-page">
      <StationHeader
        station={{ ...station, status: String(station.status) }}
        section="Schedule"
        sub="Plan the week. When no block is active, AutoDJ plays all tracks at random."
      />
      <div>
        <div style={{ marginBottom: "1.25rem" }}>
          <div className="alert alert-info" style={{ marginTop: "0.85rem", fontSize: "0.875rem" }}>
            Schedule times use this station’s timezone: <strong>{stationTimezoneLabel(station.timezone)}</strong>. A program set for 18:22 plays at 18:22 for that station’s audience, no matter where the server or admin is located.
          </div>
        </div>

        <SchedulerGrid
          stationId={stationId}
          stationTimezone={station.timezone || "UTC"}
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
      </div>
    </div>
  );
}
