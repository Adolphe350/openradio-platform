import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { generateLiqScript, type LiqConfig, type ScheduleEntry } from "@/lib/liquidsoap";

const LIQ_CONFIG_DIR = env.LIQ_CONFIG_DIR;

export async function POST(req: NextRequest, { params }: { params: Promise<{ stationId: string }> }) {
  const user = await getApiUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stationId } = await params;
  const station = await db.station.findFirst({
    where: { id: stationId, ownerId: user.id },
    include: {
      schedules: {
        where: { isActive: true },
        orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
      },
      playlists: {
        include: { tracks: { include: { track: true }, orderBy: { position: "asc" } } },
      },
    },
  });

  if (!station) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const schedules: ScheduleEntry[] = station.schedules.map((s) => ({
    name: s.name,
    dayOfWeek: s.dayOfWeek,
    startHour: s.startHour,
    startMin: s.startMin,
    endHour: s.endHour,
    endMin: s.endMin,
    playlistId: s.playlistId,
  }));

  const cfg: LiqConfig = {
    stationId: station.id,
    stationName: station.name,
    mountPath: station.mountPath,
    sourcePassword: station.sourcePassword,
    icecastHost: env.STREAM_SOURCE_HOST,
    icecastPort: env.ICECAST_SOURCE_PORT,
    genre: station.genre ?? "Mixed",
    description: station.description ?? station.name,
    appBaseUrl: env.APP_BASE_URL,
    pollSecret: env.METRICS_POLL_SECRET,
    schedules,
    bitrate: 128,
  };

  const script = generateLiqScript(cfg);

  // Write the .liq file to the shared volume
  const stationDir = path.join(LIQ_CONFIG_DIR, stationId);
  await mkdir(stationDir, { recursive: true });
  await writeFile(path.join(LIQ_CONFIG_DIR, `${stationId}.liq`), script, "utf8");

  // Write per-playlist .m3u files so Liquidsoap can read them
  for (const playlist of station.playlists) {
    const lines = playlist.tracks
      .map((pt) => pt.track.filePath ?? pt.track.fileUrl ?? "")
      .filter(Boolean);
    await writeFile(
      path.join(stationDir, `${playlist.id}.m3u`),
      lines.join("\n") + "\n",
      "utf8"
    );
  }

  return NextResponse.json({ ok: true, stationId });
}
