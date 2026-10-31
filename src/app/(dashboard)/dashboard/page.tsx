import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchIcecastStatus, findIcecastSource, normalizeIcecastSources } from "@/lib/icecast";
import { Icon } from "@/components/icons";
import { StudioClock } from "@/components/studio-clock";

export const metadata = {
  title: "Dashboard - OpenRadio",
};

interface DataPoint {
  label: string;
  value: number;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function emptyWeekBuckets(start: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      key: dayKey(date),
      label: formatDayLabel(date),
      value: 0,
    };
  });
}

function timeAgo(date: Date) {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

const lampOf = (status: string) => (status === "ACTIVE" ? "on" : status === "PAUSED" ? "paused" : "off");
const labelOf = (status: string) => (status === "ACTIVE" ? "On air" : status === "PAUSED" ? "Paused" : "Off air");

export default async function DashboardPage() {
  const user = await requireUser();

  const stations = await db.station.findMany({
    where: { ownerId: user.id },
    include: {
      _count: {
        select: { tracks: true, playlists: true, schedules: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalStations = stations.length;
  const totalTracks = stations.reduce((sum, s) => sum + s._count.tracks, 0);
  const stationIds = stations.map((station) => station.id);

  const today = startOfUtcDay(new Date());
  const thisWeekStart = new Date(today);
  thisWeekStart.setUTCDate(today.getUTCDate() - 6);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setUTCDate(thisWeekStart.getUTCDate() - 7);

  const [icecastStatus, metrics] = await Promise.all([
    fetchIcecastStatus(3500),
    stationIds.length > 0
      ? db.listenerMetric.findMany({
          where: {
            stationId: { in: stationIds },
            sampledAt: { gte: lastWeekStart },
          },
          orderBy: { sampledAt: "asc" },
          select: {
            stationId: true,
            sampledAt: true,
            currentListeners: true,
            peakListeners: true,
            uptimePercent: true,
          },
        })
      : [],
  ]);

  const sources = normalizeIcecastSources(icecastStatus?.icestats?.source);
  const liveByStation = new Map(
    stations.map((station) => {
      const source = findIcecastSource(sources, station.mountPath);
      return [
        station.id,
        {
          currentListeners: source?.listeners ?? 0,
          peakListeners: source?.listener_peak ?? source?.listeners ?? 0,
          isLive: Boolean(source),
          title: source?.title ?? source?.song ?? null,
        },
      ];
    }),
  );

  const latestMetricByStation = new Map<string, (typeof metrics)[number]>();
  for (const metric of metrics) {
    latestMetricByStation.set(metric.stationId, metric);
  }

  const getStationListenerCount = (stationId: string) => {
    const live = liveByStation.get(stationId)?.currentListeners;
    if (typeof live === "number" && live > 0) return live;
    return latestMetricByStation.get(stationId)?.currentListeners ?? 0;
  };
  const getUptime = (stationId: string) =>
    Math.round(latestMetricByStation.get(stationId)?.uptimePercent ?? (liveByStation.get(stationId)?.isLive ? 100 : 0));

  const currentListeners = stations.reduce((sum, station) => sum + getStationListenerCount(station.id), 0);

  const thisWeekBuckets = emptyWeekBuckets(thisWeekStart);
  const lastWeekBuckets = emptyWeekBuckets(lastWeekStart);
  const thisWeekMap = new Map(thisWeekBuckets.map((bucket) => [bucket.key, bucket]));
  const lastWeekMap = new Map(lastWeekBuckets.map((bucket) => [bucket.key, bucket]));

  for (const metric of metrics) {
    const key = dayKey(metric.sampledAt);
    const thisBucket = thisWeekMap.get(key);
    if (thisBucket) {
      thisBucket.value += metric.currentListeners;
      continue;
    }

    const lastBucket = lastWeekMap.get(key);
    if (lastBucket) {
      lastBucket.value += metric.currentListeners;
    }
  }

  const todayBucket = thisWeekMap.get(dayKey(today));
  if (todayBucket && currentListeners > todayBucket.value) {
    todayBucket.value = currentListeners;
  }

  const thisWeek: DataPoint[] = thisWeekBuckets.map(({ label, value }) => ({ label, value }));
  const lastWeek: DataPoint[] = lastWeekBuckets.map(({ label, value }) => ({ label, value }));
  const thisWeekTotal = thisWeek.reduce((sum, point) => sum + point.value, 0);
  const lastWeekTotal = lastWeek.reduce((sum, point) => sum + point.value, 0);
  const pctChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;
  const trendMax = Math.max(1, ...thisWeek.map((d) => d.value), ...lastWeek.map((d) => d.value));
  const hasTrend = thisWeekTotal > 0 || lastWeekTotal > 0;

  // The monitor follows the station that is on air (or the newest one).
  const monitor = stations.find((s) => liveByStation.get(s.id)?.isLive) ?? stations.find((s) => s.status === "ACTIVE") ?? stations[0] ?? null;
  const recentPlays = monitor
    ? await db.playLog.findMany({
        where: { stationId: monitor.id },
        orderBy: { playedAt: "desc" },
        take: 5,
        select: { id: true, title: true, artist: true, playedAt: true },
      })
    : [];
  const monitorLive = monitor ? liveByStation.get(monitor.id) : null;
  const nowTitle = monitorLive?.title ?? (recentPlays[0] ? `${recentPlays[0].artist ? `${recentPlays[0].artist} – ` : ""}${recentPlays[0].title}` : null);

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="desk">
      <header className="desk-head">
        <div>
          <p className="desk-kicker">
            <StudioClock /> <span className="dot-sep" aria-hidden="true">·</span> Studio desk
          </p>
          <h1 className="desk-title">Welcome back, {firstName}</h1>
          <p className="desk-sub">
            {stations.length === 0
              ? "No station yet. Create one, add music and you can be on air today."
              : `${totalStations} station${totalStations !== 1 ? "s" : ""} · ${currentListeners} listener${currentListeners !== 1 ? "s" : ""} right now · ${totalTracks.toLocaleString()} tracks in your library`}
          </p>
        </div>
        <div className="desk-head-actions">
          {monitor ? (
            <Link href="/dashboard/music" className="btn btn-secondary">
              <Icon name="upload" size={16} /> Upload music
            </Link>
          ) : null}
          <Link href="/dashboard/stations/new" className="btn btn-primary">
            <Icon name="plus" size={16} /> New station
          </Link>
        </div>
      </header>

      {!monitor ? (
        <section className="desk-empty" aria-labelledby="first-station">
          <div className="desk-empty-copy">
            <h2 id="first-station">Set up your first station</h2>
            <p>A station gets its own stream address, public page and embeddable player. It takes about a minute.</p>
            <Link href="/dashboard/stations/new" className="btn btn-primary btn-lg">
              Create a station <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <ol className="flow-steps" aria-label="How it works">
            <li><span className="flow-num">01</span><Icon name="upload" size={20} /><strong>Upload</strong><span>Add MP3s to your library and group them into playlists.</span></li>
            <li><span className="flow-num">02</span><Icon name="schedule" size={20} /><strong>Schedule</strong><span>Place playlists, episodes and shows on the weekly grid.</span></li>
            <li><span className="flow-num">03</span><Icon name="live" size={20} /><strong>Broadcast</strong><span>AutoDJ plays around the clock; go live from any Icecast encoder.</span></li>
          </ol>
        </section>
      ) : (
        <>
          <section className={`monitor${monitorLive?.isLive ? " is-live" : ""}`} aria-labelledby="monitor-title">
            <div className="monitor-main">
              <div className="monitor-top">
                <span className={`onair-pill onair-${monitorLive?.isLive ? "on" : monitor.status === "PAUSED" ? "paused" : "off"}`}>
                  <span className="onair-lamp" aria-hidden="true" />
                  <span className="onair-text">{monitorLive?.isLive ? "ON AIR" : monitor.status === "ACTIVE" ? "ACTIVE · NO SOURCE" : labelOf(monitor.status).toUpperCase()}</span>
                </span>
                <span className="monitor-mount mono">{monitor.mountPath}</span>
              </div>
              <h2 id="monitor-title" className="monitor-station">{monitor.name}</h2>
              <div className="monitor-now">
                <div className="eq" aria-hidden="true" data-live={monitorLive?.isLive ? "true" : undefined}>
                  {Array.from({ length: 24 }, (_, i) => <span key={i} style={{ animationDelay: `${(i % 7) * 0.11}s`, height: `${30 + ((i * 37) % 60)}%` }} />)}
                </div>
                <div className="monitor-now-text">
                  <p className="monitor-label">{monitorLive?.title ? "Now playing" : recentPlays[0] ? "Last played" : "Now playing"}</p>
                  <p className="monitor-track">{nowTitle ?? "Nothing logged yet"}</p>
                </div>
              </div>
              <div className="monitor-actions">
                <Link href={`/dashboard/stations/${monitor.id}?tab=overview`} className="btn btn-primary btn-sm">
                  <Icon name="live" size={16} /> Live controls
                </Link>
                <Link href={`/dashboard/stations/${monitor.id}/scheduler`} className="btn btn-secondary btn-sm">
                  <Icon name="schedule" size={16} /> Schedule
                </Link>
                <Link href={`/stations/${monitor.slug}`} className="btn btn-secondary btn-sm">
                  <Icon name="external" size={16} /> Public page
                </Link>
              </div>
            </div>

            <dl className="monitor-meters">
              <div>
                <dt>Listeners now</dt>
                <dd className="mono">{getStationListenerCount(monitor.id)}</dd>
              </div>
              <div>
                <dt>Peak (source)</dt>
                <dd className="mono">{monitorLive?.peakListeners ?? 0}</dd>
              </div>
              <div>
                <dt>Uptime</dt>
                <dd className="mono">{getUptime(monitor.id)}%</dd>
                <span className="vu-bar" aria-hidden="true"><span style={{ width: `${getUptime(monitor.id)}%` }} /></span>
              </div>
              <div>
                <dt>Stream health</dt>
                <dd className={`health ${monitorLive?.isLive ? "is-ok" : "is-idle"}`}>
                  <span className="mini-lamp" aria-hidden="true" />
                  {monitorLive?.isLive ? "Source connected" : "No source on mount"}
                </dd>
              </div>
            </dl>
          </section>

          <div className="desk-grid">
            <section className="panel" aria-labelledby="trend-title">
              <div className="panel-head">
                <h2 id="trend-title">Listener trend</h2>
                <span className={`delta ${pctChange >= 0 ? "is-up" : "is-down"}`}>
                  {pctChange >= 0 ? "+" : "−"}{Math.abs(pctChange).toFixed(1)}% vs last week
                </span>
              </div>
              {hasTrend ? (
                <>
                  <div className="trend-bars" role="img" aria-label={`Listener samples this week: ${thisWeek.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
                    {thisWeek.map((d, i) => (
                      <div key={d.label + i} className="trend-col">
                        <div className="trend-stack">
                          <span className="trend-ghost" style={{ height: `${(lastWeek[i]?.value ?? 0) / trendMax * 100}%` }} />
                          <span className="trend-bar" style={{ height: `${d.value / trendMax * 100}%` }} />
                        </div>
                        <span className="trend-label mono">{d.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="panel-foot mono">This week {thisWeekTotal.toLocaleString()} · last week {lastWeekTotal.toLocaleString()} (sum of listener samples)</p>
                </>
              ) : (
                <div className="panel-empty">
                  <Icon name="chart" size={28} />
                  <p>No listener samples yet. They appear after the metrics job polls your stream (every 5 minutes).</p>
                </div>
              )}
            </section>

            <section className="panel" aria-labelledby="log-title">
              <div className="panel-head">
                <h2 id="log-title">Play log</h2>
                <span className="panel-meta mono">{monitor.name}</span>
              </div>
              {recentPlays.length > 0 ? (
                <ol className="playlog">
                  {recentPlays.map((p) => (
                    <li key={p.id}>
                      <span className="playlog-time mono">{timeAgo(p.playedAt)}</span>
                      <span className="playlog-track">
                        <strong>{p.title}</strong>
                        {p.artist ? <span>{p.artist}</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="panel-empty">
                  <Icon name="playlist" size={28} />
                  <p>Tracks played by AutoDJ are logged here.</p>
                </div>
              )}
            </section>
          </div>

          <section aria-labelledby="rack-title">
            <div className="section-head">
              <h2 id="rack-title">Your stations</h2>
              <Link href="/dashboard/stations/new" className="text-link">
                <Icon name="plus" size={16} /> Add another
              </Link>
            </div>
            <ul className="rack">
              {stations.map((station) => {
                const live = liveByStation.get(station.id);
                return (
                  <li key={station.id} className="rack-unit">
                    <div className="rack-id">
                      <span className={`mini-lamp lamp-${live?.isLive ? "on" : lampOf(station.status)}`} aria-hidden="true" />
                      <span className="station-art station-art-sm" aria-hidden="true">
                        {station.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={station.logoUrl} alt="" />
                        ) : (
                          station.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      <div className="rack-name">
                        <Link href={`/dashboard/stations/${station.id}?tab=overview`}>{station.name}</Link>
                        <span>{labelOf(station.status)}{station.genre ? ` · ${station.genre}` : ""}</span>
                      </div>
                    </div>
                    <dl className="rack-stats">
                      <div><dt>Listeners</dt><dd className="mono">{getStationListenerCount(station.id)}</dd></div>
                      <div><dt>Tracks</dt><dd className="mono">{station._count.tracks}</dd></div>
                      <div><dt>Playlists</dt><dd className="mono">{station._count.playlists}</dd></div>
                      <div><dt>Uptime</dt><dd className="mono">{getUptime(station.id)}%</dd></div>
                    </dl>
                    <div className="rack-actions">
                      <Link href={`/dashboard/stations/${station.id}?tab=overview`} className="btn btn-primary btn-sm">Manage</Link>
                      <Link href={`/dashboard/stations/${station.id}?tab=autodj`} className="btn btn-secondary btn-sm" aria-label={`Playlists for ${station.name}`}>
                        <Icon name="playlist" size={16} /><span className="hide-sm">Playlists</span>
                      </Link>
                      <Link href={`/dashboard/stations/${station.id}/scheduler`} className="btn btn-secondary btn-sm" aria-label={`Schedule for ${station.name}`}>
                        <Icon name="schedule" size={16} /><span className="hide-sm">Schedule</span>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
