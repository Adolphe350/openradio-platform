import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ podcastId: string }> }
) {
  const { podcastId } = await params;

  const podcast = await db.podcast.findUnique({
    where: { id: podcastId },
    include: {
      episodes: { orderBy: { publishedAt: "desc" } },
      owner: { select: { name: true, email: true } },
    },
  });

  if (!podcast) {
    return new Response("Podcast not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const base = env.APP_BASE_URL.replace(/\/$/, "");
  const podcastUrl = `${base}/podcasts/${podcast.slug}`;
  const rssUrl = `${base}/api/podcasts/${podcast.id}/rss`;

  const items = podcast.episodes.map((ep) => {
    const enclosure = ep.fileUrl
      ? `<enclosure url="${escapeXml(ep.fileUrl)}" length="${ep.sizeBytes ?? 0}" type="${ep.mimeType ?? "audio/mpeg"}" />`
      : "";
    return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(ep.description ?? "")}</description>
      <pubDate>${ep.publishedAt.toUTCString()}</pubDate>
      <guid isPermaLink="false">${escapeXml(`${base}/podcasts/${podcast.slug}/episodes/${ep.id}`)}</guid>
      ${enclosure}
      ${ep.durationSec ? `<itunes:duration>${ep.durationSec}</itunes:duration>` : ""}
      ${ep.explicit ? "<itunes:explicit>yes</itunes:explicit>" : "<itunes:explicit>no</itunes:explicit>"}
    </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(podcast.title)}</title>
    <link>${escapeXml(podcastUrl)}</link>
    <description>${escapeXml(podcast.description ?? "")}</description>
    <language>${escapeXml(podcast.language)}</language>
    <atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml" />
    ${podcast.imageUrl ? `<itunes:image href="${escapeXml(podcast.imageUrl)}" />` : ""}
    ${podcast.author ? `<itunes:author>${escapeXml(podcast.author)}</itunes:author>` : ""}
    ${podcast.category ? `<itunes:category text="${escapeXml(podcast.category)}" />` : ""}
    <itunes:explicit>${podcast.explicit ? "yes" : "no"}</itunes:explicit>
    ${podcast.owner?.email ? `<managingEditor>${escapeXml(podcast.owner.email)} (${escapeXml(podcast.owner.name ?? "")})</managingEditor>` : ""}
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
