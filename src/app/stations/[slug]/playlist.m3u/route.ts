import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";
import { getRequestOrigin } from "@/lib/public-url";

export const dynamic = "force-dynamic";

type PlaylistStation = {
  name: string;
  slug: string;
  mountPath: string;
};

function normalizeMountLookup(slugOrMount: string) {
  const decoded = decodeURIComponent(slugOrMount).trim().replace(/^\/+/, "");
  const withoutExt = decoded.replace(/\.(m3u|pls|mp3)$/i, "");

  return {
    slug: withoutExt,
    mountPath: `/${withoutExt}.mp3`,
  };
}

async function findStationBySlugOrMount(slugOrMount: string) {
  const { slug, mountPath } = normalizeMountLookup(slugOrMount);

  return db.station.findFirst({
    where: {
      OR: [{ slug }, { mountPath }],
    },
    select: { name: true, slug: true, mountPath: true },
  });
}

function playlistResponse(req: NextRequest, station: PlaylistStation) {
  const streamUrl = getPublicStreamUrl(station.mountPath);
  const origin = getRequestOrigin(req);
  const absoluteUrl = streamUrl.startsWith("/") ? `${origin}${streamUrl}` : streamUrl;
  const m3u = `#EXTM3U\n#EXTINF:-1 tvg-name="${station.name}",${station.name}\n${absoluteUrl}\n`;

  return new Response(m3u, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpegurl",
      "Content-Disposition": `attachment; filename="${station.slug}.m3u"`,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const station = await findStationBySlugOrMount(slug);

  if (!station) {
    return new Response("Station not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return playlistResponse(req, station);
}
