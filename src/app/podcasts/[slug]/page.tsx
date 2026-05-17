import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const podcast = await db.podcast.findUnique({ where: { slug } });
  if (!podcast) return { title: "Podcast not found" };
  return {
    title: podcast.title,
    description: podcast.description ?? `Listen to ${podcast.title} on OpenRadio`,
  };
}

export default async function PublicPodcastPage({ params }: Props) {
  const { slug } = await params;

  const podcast = await db.podcast.findUnique({
    where: { slug },
    include: {
      episodes: { orderBy: { publishedAt: "desc" } },
      owner: { select: { name: true } },
    },
  });

  if (!podcast) notFound();

  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <SiteHeader />

      <div className="container" style={{ padding: "2rem 0 4rem" }}>
        <div className="podcast-public-layout" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.75rem", alignItems: "start" }}>

          <div>
            <div className="card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
              <div className="podcast-header-row" style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ width: 80, height: 80, borderRadius: 12, background: "var(--brand-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", flexShrink: 0 }}>
                  {podcast.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={podcast.imageUrl} alt={podcast.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                    : "🎙"}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.5rem" }}>{podcast.title}</h1>
                  <p style={{ margin: "0 0 0.5rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                    by {podcast.author ?? podcast.owner?.name}
                    {podcast.category && ` · ${podcast.category}`}
                    {` · ${podcast.language.toUpperCase()}`}
                  </p>
                  {podcast.description && (
                    <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>{podcast.description}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0, fontSize: "1rem" }}>Episodes ({podcast.episodes.length})</h2>
                <a href={`/api/podcasts/${podcast.id}/rss`} style={{ fontSize: "0.82rem", color: "var(--brand)", fontWeight: 600 }} target="_blank" rel="noreferrer">RSS Feed</a>
              </div>
              {podcast.episodes.length === 0 ? (
                <p style={{ padding: "1.5rem 1.25rem", color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>No episodes yet.</p>
              ) : podcast.episodes.map((ep, i) => (
                <div key={ep.id} style={{ padding: "1rem 1.25rem", borderBottom: i < podcast.episodes.length - 1 ? "1px solid var(--border)" : "none", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 0.3rem", fontWeight: 600 }}>{ep.title}</p>
                    {ep.description && <p style={{ margin: "0 0 0.4rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>{ep.description}</p>}
                    <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      <span>{ep.publishedAt.toLocaleDateString()}</span>
                      {ep.durationSec && <span>{Math.floor(ep.durationSec / 60)} min</span>}
                    </div>
                  </div>
                  {ep.fileUrl && (
                    <audio controls preload="none" src={ep.fileUrl} style={{ height: 36, borderRadius: 8, maxWidth: "100%" }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: "1rem" }}>
            <div className="card" style={{ padding: "1.25rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>Subscribe</h3>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>Copy the RSS feed URL to subscribe in your podcast app.</p>
              <a href={`/api/podcasts/${podcast.id}/rss`} className="btn btn-primary btn-sm btn-full" target="_blank" rel="noreferrer">Get RSS Feed</a>
            </div>
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <Link href="/explore" className="btn btn-secondary btn-sm btn-full">Explore Stations</Link>
            </div>
          </div>

        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
