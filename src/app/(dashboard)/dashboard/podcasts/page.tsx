import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPodcastAction, deletePodcastAction } from "./actions";

export const metadata = { title: "Podcasts – OpenRadio" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function PodcastsPage({ searchParams }: Props) {
  const user = await requireUser();
  const { error } = await searchParams;

  const podcasts = await db.podcast.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { episodes: true } } },
  });

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Podcasts</h1>
          <p className="dash-page-sub">Create and manage your podcast shows.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {error && <div className="alert alert-error">{decodeURIComponent(error)}</div>}

      <div className="card" style={{ padding: "1.5rem", maxWidth: 640 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Create a New Podcast</h2>
        <form action={createPodcastAction} style={{ display: "grid", gap: "0.85rem" }}>
          <div className="field">
            <label htmlFor="title">Podcast Title *</label>
            <input id="title" name="title" required minLength={2} maxLength={120} placeholder="e.g. The Morning Show" />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} maxLength={1000} placeholder="What is your podcast about?" style={{ width: "100%", resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="author">Author</label>
              <input id="author" name="author" maxLength={120} placeholder="Your name" />
            </div>
            <div className="field">
              <label htmlFor="language">Language</label>
              <input id="language" name="language" defaultValue="en" maxLength={10} placeholder="en" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" name="category">
              <option value="">— Select category —</option>
              {["Arts", "Business", "Comedy", "Education", "Fiction", "Government", "History", "Health & Fitness", "Kids & Family", "Leisure", "Music", "News", "Religion & Spirituality", "Science", "Society & Culture", "Sports", "Technology", "True Crime", "TV & Film"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <button className="btn btn-primary" type="submit">Create Podcast</button>
          </div>
        </form>
      </div>

      {podcasts.length > 0 && (
        <div className="card" style={{ overflow: "hidden", marginTop: "1.25rem" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "1rem", margin: 0 }}>Your Podcasts ({podcasts.length})</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th style={{ textAlign: "center" }}>Episodes</th>
                <th>RSS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {podcasts.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>
                    <Link href={`/dashboard/podcasts/${p.id}`} style={{ color: "var(--brand)" }}>{p.title}</Link>
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>{p.category ?? "—"}</td>
                  <td style={{ textAlign: "center" }}>{p._count.episodes}</td>
                  <td>
                    <a href={`/api/podcasts/${p.id}/rss`} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", fontSize: "0.82rem" }}>RSS Feed</a>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <Link href={`/dashboard/podcasts/${p.id}`} className="btn btn-secondary btn-sm">Manage</Link>
                      <form action={deletePodcastAction} style={{ display: "inline" }}>
                        <input type="hidden" name="podcastId" value={p.id} />
                        <button className="btn btn-danger btn-sm" type="submit">Delete</button>
                      </form>
                    </div>
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
