import Link from "next/link";
import { Icon } from "@/components/icons";

type Props = {
  station: { id: string; name: string; slug: string; status: string; genre?: string | null; logoUrl?: string | null };
  section: string;
  sub?: string;
  actions?: React.ReactNode;
};

/** Top strip of every station-admin screen: station art, ON AIR lamp, section title. */
export function StationHeader({ station, section, sub, actions }: Props) {
  const lamp = station.status === "ACTIVE" ? "on" : station.status === "PAUSED" ? "paused" : "off";
  const label = station.status === "ACTIVE" ? "On air" : station.status === "PAUSED" ? "Paused" : "Off air";
  return (
    <header className="station-head">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/dashboard">Stations</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/dashboard/stations/${station.id}?tab=overview`}>{station.name}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{section}</span>
      </nav>
      <div className="station-head-row">
        <div className="station-head-id">
          <span className="station-art" aria-hidden="true">
            {station.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={station.logoUrl} alt="" />
            ) : (
              station.name.charAt(0).toUpperCase()
            )}
          </span>
          <div>
            <h1 className="station-head-title">{section}</h1>
            <p className="station-head-sub">
              <span className={`mini-lamp lamp-${lamp}`} aria-hidden="true" />
              <span className="mono">{label}</span>
              <span className="dot-sep" aria-hidden="true">·</span>
              <span>{station.name}</span>
              {station.genre ? (
                <>
                  <span className="dot-sep" aria-hidden="true">·</span>
                  <span>{station.genre}</span>
                </>
              ) : null}
            </p>
            {sub ? <p className="station-head-note">{sub}</p> : null}
          </div>
        </div>
        <div className="station-head-actions">
          {actions}
          <Link href={`/stations/${station.slug}`} className="btn btn-secondary btn-sm">
            <Icon name="external" size={16} /> Public page
          </Link>
        </div>
      </div>
    </header>
  );
}
