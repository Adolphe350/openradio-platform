import Link from "next/link";

import { StudioWorkbench } from "@/components/studio-workbench";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Studio – OpenRadio" };

type Props = {
  searchParams: Promise<{ stationId?: string }>;
};

export default async function StudioPage({ searchParams }: Props) {
  const user = await requireUser();
  const { stationId } = await searchParams;

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      tracks: {
        orderBy: { createdAt: "desc" },
        take: 140,
        select: {
          id: true,
          title: true,
          artist: true,
          durationSec: true,
          fileUrl: true,
          filePath: true,
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
            <h1 className="dash-page-title">Studio</h1>
            <p className="dash-page-sub">Record voice tracks and episodes directly in your browser.</p>
          </div>
          <Link href="/dashboard/stations/new" className="btn btn-primary">
            + Create Station
          </Link>
        </div>

        <div className="card empty-state">
          <span className="empty-icon">🎙</span>
          <h3 style={{ margin: 0 }}>Create a station first</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "40ch" }}>
            Studio sessions are station-scoped so your recordings and music beds map cleanly to each stream.
          </p>
          <Link href="/dashboard/stations/new" className="btn btn-primary">Create station</Link>
        </div>
      </div>
    );
  }

  const normalizedStations = stations.map((station) => ({
    id: station.id,
    name: station.name,
    slug: station.slug,
    status: station.status,
    tracks: station.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      durationSec: track.durationSec,
      hasAudio: Boolean(track.fileUrl || track.filePath),
      previewUrl: `/api/audio/${track.id}`,
    })),
  }));

  const initialStationId =
    normalizedStations.find((station) => station.id === stationId)?.id ??
    normalizedStations[0].id;

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Studio</h1>
          <p className="dash-page-sub">Browser-based recording, local draft capture, and voice-over mixing with music beds.</p>
        </div>
        <div className="mobile-full-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link href={`/dashboard/music?stationId=${initialStationId}`} className="btn btn-secondary">Manage Music</Link>
          <Link href="/dashboard/podcasts" className="btn btn-primary">Podcasts</Link>
        </div>
      </div>

      <div className="alert alert-info">
        This first Studio pass records locally in your browser for reliable offline draft capture. Live mode also toggles the current recording API metadata endpoint when available.
      </div>

      <StudioWorkbench stations={normalizedStations} initialStationId={initialStationId} />
    </div>
  );
}
