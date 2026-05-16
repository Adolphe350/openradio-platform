import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getPublicStreamUrl } from "@/lib/stream";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const station = await db.station.findUnique({ where: { slug }, select: { name: true } });
  return { title: station ? `${station.name} – Live Radio` : "Radio Player" };
}

function stationGradient(id: string) {
  const h1 = (id.charCodeAt(0) * 47 + id.charCodeAt(1) * 31) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg,hsl(${h1},55%,42%),hsl(${h2},60%,28%))`;
}

export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const station = await db.station.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, genre: true, country: true, logoUrl: true, mountPath: true, status: true },
  });

  if (!station) notFound();

  const streamUrl = getPublicStreamUrl(station.mountPath);
  const grad = stationGradient(station.id);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:Inter,-apple-system,sans-serif;background:#1a1a2e;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center}
          .widget{background:#16213e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:1.25rem;width:320px;display:grid;gap:1rem}
          .row{display:flex;align-items:center;gap:0.9rem}
          .logo{width:52px;height:52px;border-radius:10px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:1.6rem}
          .name{font-weight:700;font-size:0.975rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
          .meta{font-size:0.78rem;color:rgba(255,255,255,0.5);margin-top:0.15rem}
          audio{width:100%;height:40px;accent-color:#00c8a0;border-radius:8px}
          .footer{display:flex;align-items:center;justify-content:space-between;font-size:0.72rem;color:rgba(255,255,255,0.3)}
          .live{display:flex;align-items:center;gap:0.3rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,0.45)}
          .dot{width:7px;height:7px;border-radius:50%;background:#ef4444;animation:pulse 1.8s ease infinite}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
          a{color:#00c8a0;text-decoration:none}
          a:hover{text-decoration:underline}
        `}</style>
      </head>
      <body>
        <div className="widget">
          <div className="row">
            <div className="logo" style={{ background: station.logoUrl ? undefined : grad }}>
              {station.logoUrl
                ? <img src={station.logoUrl} alt={station.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : "📻"}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="name">{station.name}</p>
              <p className="meta">{station.genre ?? "Live Radio"}{station.country ? ` · ${station.country}` : ""}</p>
            </div>
          </div>

          <audio controls preload="none" src={streamUrl} />

          <div className="footer">
            <div className="live">
              <span className="dot" />
              {station.status === "ACTIVE" ? "Live" : station.status}
            </div>
            <a href={`/stations/${station.slug}`} target="_blank" rel="noreferrer">
              Open station →
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
