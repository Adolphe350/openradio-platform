export const dynamic = "force-dynamic";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icon, type IconName } from "@/components/icons";
import { getExploreStations } from "@/lib/explore";

const capabilities: { icon: IconName; title: string; text: string }[] = [
  { icon: "live", title: "Live input", text: "Connect BUTT, RadioBOSS, Mixxx or OBS over Icecast, or over HTTPS port 443 when 8000 is blocked." },
  { icon: "playlist", title: "AutoDJ", text: "Liquidsoap plays your playlists around the clock and logs every track it plays." },
  { icon: "schedule", title: "Weekly schedule", text: "Drop playlists, single tracks, recordings or podcast episodes onto a 7-day grid in your station's timezone." },
  { icon: "record", title: "Recording", text: "Start and stop a recording of the live broadcast from the dashboard." },
  { icon: "podcast", title: "Podcasts", text: "Publish episodes with an RSS feed, and schedule them on air." },
  { icon: "listeners", title: "Listener stats", text: "Current and peak listeners polled from Icecast every 5 minutes, with daily trends." },
  { icon: "globe", title: "Geo-blocking & relays", text: "Block countries from your stream and push it to relay servers." },
  { icon: "royalty", title: "Royalties report", text: "Plays per artist and title from the play log, for music licensing reports." },
];

const faqs = [
  {
    q: "What do I need to start?",
    a: "An account and a station name. You can run on AutoDJ with uploaded MP3s straight away; a live encoder is only needed for live shows.",
  },
  {
    q: "Which encoders work?",
    a: "Any Icecast-compatible source client: BUTT, RadioBOSS, Mixxx, OBS, ices2 or Liquidsoap. Your station's Live screen shows the server, port, mount and password to enter.",
  },
  {
    q: "What happens when I am not live?",
    a: "AutoDJ plays your playlists. If a schedule block is active it plays that block; otherwise it plays your library at random.",
  },
  {
    q: "How do listeners tune in?",
    a: "On your public station page, through the player you embed on your own website, or with the direct MP3, M3U, PLS (and HLS where enabled) links.",
  },
  {
    q: "Is there a size limit for uploads?",
    a: "Each audio file can be up to 50 MB on this server.",
  },
  {
    q: "Can I see who is listening?",
    a: "You see current and peak listener counts per station, listening hours and a weekly trend. Counts come from the Icecast server.",
  },
];

export default async function HomePage() {
  const liveStations = await getExploreStations({ sort: "trending", limit: 4 }).catch(() => []);
  const appUrl = (process.env.APP_BASE_URL || "https://openradio.iraady.com").replace(/\/$/, "");
  const sampleSlug = liveStations[0]?.slug ?? "your-station";

  return (
    <>
      <SiteHeader />

      <main id="main" className="landing">
        {/* ── Hero: headline + studio dashboard mockup ─────────────────── */}
        <section className="l-hero">
          <div className="pub-wrap l-hero-grid">
            <div className="l-hero-copy">
              <p className="l-kicker mono">
                <span className="mini-lamp lamp-on" aria-hidden="true" /> Internet radio hosting
              </p>
              <h1>
                Run your own radio station. <span>On air tonight.</span>
              </h1>
              <p className="l-lede">
                Upload your music, plan the week on a schedule grid, and go live from any Icecast encoder.
                When you step away from the mic, AutoDJ keeps the station playing.
              </p>
              <div className="l-cta">
                <Link href="/sign-up" className="btn btn-primary btn-lg">
                  Get started <Icon name="arrow-right" size={18} />
                </Link>
                <Link href="/explore" className="btn btn-secondary btn-lg">
                  <Icon name="listeners" size={18} /> Listen to stations
                </Link>
              </div>
              <p className="l-hero-note">Free to sign up. One account can run several stations.</p>
            </div>

            <figure className="console" aria-label="Sample of the station dashboard">
              <div className="console-bar">
                <span className="console-dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="mono">studio · sample screen</span>
              </div>
              <div className="console-body">
                <aside className="console-side" aria-hidden="true">
                  <span className="onair-pill onair-on onair-compact"><span className="onair-lamp" /><span className="onair-text">ON AIR</span></span>
                  {(["dashboard", "live", "library", "playlist", "schedule", "embed", "listeners"] as IconName[]).map((n, i) => (
                    <span key={n} className={`console-side-item${i === 1 ? " is-active" : ""}`}><Icon name={n} size={15} /></span>
                  ))}
                </aside>
                <div className="console-main">
                  <div className="console-now">
                    <span className="onair-bulb is-on" aria-hidden="true" />
                    <div>
                      <p className="console-label mono">NOW PLAYING</p>
                      <p className="console-track">Evening Drive — Live with Aline</p>
                    </div>
                    <span className="console-time mono">18:42</span>
                  </div>
                  <div className="console-wave" aria-hidden="true">
                    {Array.from({ length: 48 }, (_, i) => (
                      <span key={i} style={{ height: `${18 + Math.abs(Math.sin(i * 0.7) * 62) + (i % 5) * 4}%`, animationDelay: `${(i % 9) * 0.09}s` }} />
                    ))}
                  </div>
                  <dl className="console-meters">
                    <div><dt>Listeners</dt><dd className="mono">128</dd></div>
                    <div><dt>Uptime</dt><dd className="mono">99.8%</dd></div>
                    <div><dt>Bitrate</dt><dd className="mono">128k</dd></div>
                    <div><dt>Source</dt><dd className="mono ok">LIVE</dd></div>
                  </dl>
                  <div className="console-sched" aria-hidden="true">
                    <span className="mono">18:00</span><span className="blk blk-live">Evening Drive</span>
                    <span className="mono">20:00</span><span className="blk">AutoDJ · Afro Soul</span>
                    <span className="mono">22:00</span><span className="blk blk-pod">Podcast hour</span>
                  </div>
                </div>
              </div>
              <figcaption className="demo-tag mono">Demo data</figcaption>
            </figure>
          </div>
        </section>

        {/* ── Flow: Upload · Schedule · Broadcast ─────────────────────── */}
        <section className="l-flow" aria-labelledby="flow-title">
          <div className="pub-wrap">
            <p className="l-eyebrow mono">How a station runs</p>
            <h2 id="flow-title" className="l-h2">Upload. Schedule. Broadcast.</h2>
            <ol className="flow-line">
              <li>
                <span className="flow-num mono">01</span>
                <h3><Icon name="upload" size={20} /> Upload</h3>
                <p>Add MP3s to your station library, edit titles and artists, and group tracks into playlists.</p>
                <div className="flow-demo flow-demo-lib" aria-hidden="true">
                  <span><b>Umutima</b><i className="mono">03:58</i></span>
                  <span><b>Kigali Nights</b><i className="mono">04:12</i></span>
                  <span className="up"><b>Morning Mix.mp3</b><i className="mono">72%</i></span>
                </div>
              </li>
              <li>
                <span className="flow-num mono">02</span>
                <h3><Icon name="schedule" size={20} /> Schedule</h3>
                <p>Place playlists, tracks, recordings and podcast episodes on a weekly grid. Times follow your station&apos;s timezone.</p>
                <div className="flow-demo flow-demo-grid" aria-hidden="true">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
                    <span key={d} className="col">
                      <i className="mono">{d}</i>
                      <b style={{ height: `${30 + (i * 17) % 40}%`, top: `${10 + (i * 13) % 30}%` }} />
                    </span>
                  ))}
                </div>
              </li>
              <li>
                <span className="flow-num mono">03</span>
                <h3><Icon name="live" size={20} /> Broadcast</h3>
                <p>Go live from your encoder, or let AutoDJ play. Listeners tune in on your station page or your own website.</p>
                <div className="flow-demo flow-demo-enc mono" aria-hidden="true">
                  <span>host <b>stream.example</b></span>
                  <span>mount <b>/your-station</b></span>
                  <span>status <b className="ok">● connected</b></span>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ── Embed showcase ──────────────────────────────────────────── */}
        <section className="l-embed" aria-labelledby="embed-title">
          <div className="pub-wrap l-embed-grid">
            <div>
              <p className="l-eyebrow mono">Embed &amp; share</p>
              <h2 id="embed-title" className="l-h2">Your player, on your website.</h2>
              <p className="l-text">
                Every station has a small web player. Paste one line of HTML into any site, or share the direct stream links for apps and smart speakers that accept MP3, M3U or PLS.
              </p>
              <pre className="codeblock" tabIndex={0} aria-label="Embed code example"><code>{`<iframe
  src="${appUrl}/embed/${sampleSlug}"
  width="320" height="120"
  frameborder="0" allow="autoplay">
</iframe>`}</code></pre>
            </div>
            <div className="embed-mock" aria-label="Sample embedded player">
              <div className="embed-mock-site" aria-hidden="true">
                <span className="line w60" /><span className="line w90" /><span className="line w75" />
              </div>
              <div className="mini-player">
                <span className="mini-player-art" aria-hidden="true">{(liveStations[0]?.name ?? "R").charAt(0).toUpperCase()}</span>
                <div className="mini-player-text">
                  <strong>{liveStations[0]?.name ?? "Your Station"}</strong>
                  <span>{liveStations[0]?.genre ?? "Live radio"}</span>
                </div>
                <span className="mini-player-btn" aria-hidden="true"><Icon name="play" size={18} /></span>
              </div>
              <div className="embed-mock-site" aria-hidden="true">
                <span className="line w80" /><span className="line w50" />
              </div>
            </div>
          </div>
        </section>

        {/* ── What's in the studio (patch bay) ────────────────────────── */}
        <section className="l-bay" aria-labelledby="bay-title">
          <div className="pub-wrap">
            <p className="l-eyebrow mono">In the studio</p>
            <h2 id="bay-title" className="l-h2">Everything a small station needs.</h2>
            <ul className="patchbay">
              {capabilities.map((c, i) => (
                <li key={c.title}>
                  <span className="patch-jack mono" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <Icon name={c.icon} size={20} />
                  <div>
                    <h3>{c.title}</h3>
                    <p>{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── On the dial (real stations) ─────────────────────────────── */}
        {liveStations.length > 0 ? (
          <section className="l-dial" aria-labelledby="dial-title">
            <div className="pub-wrap">
              <div className="section-head">
                <h2 id="dial-title" className="l-h2">On the dial</h2>
                <Link href="/explore" className="text-link">All stations <Icon name="arrow-right" size={16} /></Link>
              </div>
              <ul className="dial">
                {liveStations.map((s) => (
                  <li key={s.id}>
                    <Link href={`/stations/${s.slug}`} className="dial-card">
                      <span className="station-art" aria-hidden="true">
                        {s.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logoUrl} alt="" />
                        ) : (
                          s.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="dial-text">
                        <strong>{s.name}</strong>
                        <span>{[s.genre, s.country].filter(Boolean).join(" · ") || "Live radio"}</span>
                      </span>
                      <span className={`mini-lamp lamp-${s.status === "ACTIVE" ? "on" : "paused"}`} aria-label={s.status === "ACTIVE" ? "Active" : "Paused"} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section className="l-faq" aria-labelledby="faq-title">
          <div className="pub-wrap l-faq-grid">
            <div>
              <p className="l-eyebrow mono">Questions</p>
              <h2 id="faq-title" className="l-h2">Before you go on air</h2>
              <p className="l-text">More detail on <Link href="/streaming">live streaming</Link> and <Link href="/automation">AutoDJ</Link>.</p>
            </div>
            <div className="faq">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}<Icon name="plus" size={18} /></summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section className="l-final" aria-labelledby="final-title">
          <div className="pub-wrap l-final-row">
            <div className="l-final-sign" aria-hidden="true">
              <span className="onair-bulb is-on" /> ON AIR
            </div>
            <div>
              <h2 id="final-title">Your station is one form away.</h2>
              <p>Create an account, name your station, and press play.</p>
            </div>
            <div className="l-cta">
              <Link href="/sign-up" className="btn btn-primary btn-lg">Get started</Link>
              <Link href="/pricing" className="btn btn-secondary btn-lg">See plans</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
