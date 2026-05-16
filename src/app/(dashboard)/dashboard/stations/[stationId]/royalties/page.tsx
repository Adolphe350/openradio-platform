import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Royalty Report" };

type Props = { params: Promise<{ stationId: string }> };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(d: Date) {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function RoyaltiesPage({ params }: Props) {
  const user = await requireUser();
  const { stationId } = await params;

  const station = await db.station.findFirst({
    where: { id: stationId, ownerId: user.id },
    select: { id: true, name: true, slug: true },
  });
  if (!station) notFound();

  const logs = await db.playLog.findMany({
    where: { stationId },
    orderBy: { playedAt: "desc" },
    take: 500,
  });

  // Aggregate play counts by artist
  const artistCounts: Record<string, { plays: number; titles: Set<string> }> = {};
  for (const log of logs) {
    if (!artistCounts[log.artist]) artistCounts[log.artist] = { plays: 0, titles: new Set() };
    artistCounts[log.artist].plays++;
    artistCounts[log.artist].titles.add(log.title);
  }
  const topArtists = Object.entries(artistCounts)
    .map(([artist, { plays, titles }]) => ({ artist, plays, titles: titles.size }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 20);

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Royalty Report</h1>
          <p className="dash-page-sub">{station.name} · Last {logs.length} plays</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href={`/dashboard/stations/${stationId}`} className="btn btn-secondary btn-sm">← Studio</Link>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">🎵</span>
          <h3 style={{ margin: 0 }}>No play history yet</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Play logs are recorded when your AutoDJ or encoder reports what&apos;s playing.
          </p>
        </div>
      ) : (
        <>
          {/* Top artists */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "1rem", margin: 0 }}>Top Artists by Play Count</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Artist</th>
                  <th style={{ textAlign: "center" }}>Plays</th>
                  <th style={{ textAlign: "center" }}>Unique Tracks</th>
                </tr>
              </thead>
              <tbody>
                {topArtists.map((row, i) => (
                  <tr key={row.artist}>
                    <td style={{ color: "var(--text-muted)", width: 40 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{row.artist}</td>
                    <td style={{ textAlign: "center" }}>{row.plays}</td>
                    <td style={{ textAlign: "center" }}>{row.titles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Full play log */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1rem", margin: 0 }}>Full Play Log</h2>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{logs.length} entries</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Artist</th>
                    <th>Day</th>
                    <th>Played At</th>
                    <th style={{ textAlign: "center" }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600, fontSize: "0.85rem" }}>{log.title}</td>
                      <td style={{ fontSize: "0.85rem" }}>{log.artist}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{DAYS[log.playedAt.getDay()]}</td>
                      <td style={{ fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(log.playedAt)}</td>
                      <td style={{ textAlign: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        {log.durationSec ? `${Math.floor(log.durationSec / 60)}:${String(log.durationSec % 60).padStart(2, "0")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
