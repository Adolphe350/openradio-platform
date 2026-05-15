import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const { stationId } = await params;

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, name: true, slug: true, mountPath: true, description: true, genre: true },
  });

  if (!station) {
    return new Response("Station not found", { status: 404 });
  }

  const streamUrl = getPublicStreamUrl(station.mountPath);
  const origin = req.nextUrl.origin;
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
