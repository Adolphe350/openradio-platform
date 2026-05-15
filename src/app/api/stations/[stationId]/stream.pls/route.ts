import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  const { stationId } = await params;

  const station = await db.station.findUnique({
    where: { id: stationId },
    select: { id: true, name: true, slug: true, mountPath: true },
  });

  if (!station) {
    return new Response("Station not found", { status: 404 });
  }

  const streamUrl = getPublicStreamUrl(station.mountPath);
  const absoluteUrl = streamUrl.startsWith("/") ? `${env.APP_BASE_URL}${streamUrl}` : streamUrl;

  const pls = `[playlist]\nFile1=${absoluteUrl}\nTitle1=${station.name}\nLength1=-1\nNumberOfEntries=1\nVersion=2\n`;

  return new Response(pls, {
    status: 200,
    headers: {
      "Content-Type": "audio/x-scpls",
      "Content-Disposition": `attachment; filename="${station.slug}.pls"`,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
