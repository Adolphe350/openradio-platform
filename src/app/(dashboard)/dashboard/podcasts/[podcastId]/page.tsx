import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createEpisodeAction, deleteEpisodeAction } from "../actions";

type Props = {
  params: Promise<{ podcastId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PodcastDetailPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { podcastId } = await params;
  const { error } = await searchParams;

  const podcast = await db.podcast.findFirst({
    where: { id: podcastId, ownerId: user.id },
    include: {
      episodes: { orderBy: { publishedAt: "desc" } },
    },
  });

  if (!podcast) notFound();

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">{podcast.title}</h1>
          <p className="dash-page-sub">{podcast.episodes.length} episode{podcast.episodes.length !== 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <a href={`/api/podcasts/${podcast.id}/rss`} className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer">RSS Feed</a>
          <a href={`/podcasts/${podcast.slug}`} className="btn btn-secondary btn-sm" target="_blank" rel="noreferrer">Public Page</a>
          <Link href="/dashboard/podcasts" className="btn btn-secondary btn-sm">← Podcasts</Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{decodeURIComponent(error)}</div>}

      <div className="card" style={{ padding: "1.5rem", maxWidth: 640 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Add Episode</h2>
        <form action={createEpisodeAction} style={{ display: "grid", gap: "0.85rem" }}>
          <input type="hidden" name="podcastId" value={podcast.id} />
          <div className="field">
            <label htmlFor="ep-title">Title *</label>
            <input id="ep-title" name="title" required maxLength={200} placeholder="Episode title" />
          </div>
          <div className="field">
            <label htmlFor="ep-desc">Description</label>
            <textarea id="ep-desc" name="description" rows={3} maxLength={2000} placeholder="Episode description..." style={{ width: "100%", resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="ep-url">Audio File URL</label>
              <input id="ep-url" name="fileUrl" type="url" placeholder="https://example.com/episode.mp3" />
            </div>
            <div className="field">
              <label htmlFor="ep-dur">Duration (seconds)</label>
              <input id="ep-dur" name="durationSec" type="number" min={1} placeholder="e.g. 1800" />
            </div>
          </div>
          <div>
            <button className="btn btn-primary" type="submit">Add Episode</button>
          </div>
        </form>
      </div>

      {podcast.episodes.length > 0 && (
        <div className="card" style={{ overflow: "hidden", marginTop: "1.25rem" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>Episodes ({podcast.episodes.length})</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Published</th>
                <th>Duration</th>
                <th>File</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {podcast.episodes.map((ep) => (
                <tr key={ep.id}>
                  <td style={{ fontWeight: 600 }}>{ep.title}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{ep.publishedAt.toLocaleDateString()}</td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {ep.durationSec ? `${Math.floor(ep.durationSec / 60)}m ${ep.durationSec % 60}s` : "—"}
                  </td>
                  <td>
                    {ep.fileUrl ? (
                      <a href={ep.fileUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontSize: "0.82rem" }}>Play</a>
                    ) : <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>No file</span>}
                  </td>
                  <td>
                    <form action={deleteEpisodeAction} style={{ display: "inline" }}>
                      <input type="hidden" name="podcastId" value={podcast.id} />
                      <input type="hidden" name="episodeId" value={ep.id} />
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
  );
}
