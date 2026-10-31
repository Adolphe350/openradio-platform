import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";
import { EmbedPlayer } from "./embed-player";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = await db.station.findUnique({ where: { slug }, select: { name: true } });
  return { title: station ? `${station.name} – Live Radio` : "Radio Player" };
}

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, genre: true, country: true, logoUrl: true, mountPath: true, status: true },
  });

  if (!station) notFound();

  const streamUrl = getPublicStreamUrl(station.mountPath);

  return (
    <div className="embed-body">
      {/* Transparent page so the player sits cleanly inside any site. */}
      <style>{`html,body{background:transparent!important}`}</style>
      <EmbedPlayer
        stationId={station.id}
        stationName={station.name}
        stationSlug={station.slug}
        streamUrl={streamUrl}
        genre={[station.genre, station.country].filter(Boolean).join(" · ") || null}
        logoUrl={station.logoUrl}
      />
    </div>
  );
}
