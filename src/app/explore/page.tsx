import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getExploreFilters, getExploreStations, parseExploreSearchParams, type ExploreStation } from "@/lib/explore";

export const metadata = {
  title: "Explore stations",
  description: "Find active OpenRadio stations by name, genre, language, and country.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const sortOptions = [
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recently updated" },
  { value: "name", label: "Name (A-Z)" },
] as const;

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = parseExploreSearchParams(await searchParams);
  const filters = {
    ...params,
    sort: params.sort ?? "trending",
    limit: 30,
  };

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function StationCard({ s }: { s: ExploreStation }) {
  const trendText = s.publicTrend === "up" ? "rising" : s.publicTrend === "down" ? "cooling" : "steady";

  return (
    <Link href={`/stations/${s.slug}`} className="station-card">
      <div
        className="station-card-thumb"
        style={{ background: s.logoUrl ? undefined : stationColor(s.id), position: "relative" }}
      >
        {s.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.logoUrl} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📻</div>
        )}
        {s.status === "ACTIVE" && (
          <span
            style={{
              position: "absolute", top: 7, right: 7,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              fontSize: "0.65rem", fontWeight: 700,
              padding: "0.12rem 0.45rem", borderRadius: "999px",
              display: "flex", alignItems: "center", gap: "0.3rem",
            }}
          >
            <span className="live-dot" style={{ width: 6, height: 6 }} />LIVE
          </span>
        )}
      </div>
      <div className="station-card-body">
        <p className="station-card-title">{s.name}</p>
        <p className="station-card-meta">{s.genre ?? "Radio"}{s.country ? ` · ${s.country}` : ""}</p>
        <p className="station-card-meta" style={{ marginTop: "0.35rem", fontWeight: 600 }}>
          {formatCompact(s.publicListenersNow)} {s.popularityConfidence === "measured" ? "listening now" : "tuning in now"}
        </p>
        <p className="station-card-meta" style={{ fontSize: "0.72rem" }}>
          {formatCompact(s.publicWeeklyReach)} weekly reach · {trendText}
        </p>
      </div>
    </Link>
  );
}

export default async function ExplorePage({ searchParams }: Props) {
  const params = parseExploreSearchParams(await searchParams);
  const hasFilter = !!(params.q || params.genre || params.language || params.country);
  const filters = { ...params, sort: params.sort ?? "trending", limit: 48 };

  const [stations, facets, trending, top] = await Promise.all([
    getExploreStations(filters),
    getExploreFilters(),
    hasFilter ? Promise.resolve([]) : getExploreStations({ sort: "trending", limit: 16 }),
    hasFilter ? Promise.resolve([]) : getExploreStations({ sort: "recent", limit: 8 }),
  ]);

  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <SiteHeader />

      <section style={{ padding: "3rem 0 2rem" }}>
        <div className="container">
          <div style={{ maxWidth: "600px" }}>
            <div className="badge" style={{ marginBottom: "0.75rem" }}>Discovery</div>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", margin: "0 0 0.5rem" }}>
              Explore stations
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: "1rem", lineHeight: 1.6 }}>
              Find stations by name, genre, language, or country. Only active and paused stations appear here.
            </p>
          </div>
        </div>
      </div>

      <section style={{ padding: "0 0 2rem" }}>
        <div className="container">
          <div className="card" style={{ padding: "1.25rem" }}>
            <form method="GET" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", alignItems: "end" }}>
              <div className="field" style={{ gridColumn: "span 2" }}>
                <label htmlFor="q">Search</label>
                <input
                  id="q"
                  className="input"
                  type="search"
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Station name or genre..."
                />
              </div>

              <div className="field">
                <label htmlFor="genre">Genre</label>
                <select id="genre" name="genre" defaultValue={params.genre ?? ""}>
                  <option value="">All genres</option>
                  {facetOptions.genres.map((genre) => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="language">Language</label>
                <select id="language" name="language" defaultValue={params.language ?? ""}>
                  <option value="">All</option>
                  {facetOptions.languages.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="country">Country</label>
                <select id="country" name="country" defaultValue={params.country ?? ""}>
                  <option value="">All</option>
                  {facetOptions.countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="sort">Sort by</label>
                <select id="sort" name="sort" defaultValue={filters.sort}>
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
                <button className="btn primary" type="submit">Filter</button>
                <Link href="/explore" className="btn secondary">Reset</Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 0 1rem" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            {stations.length} station{stations.length === 1 ? "" : "s"} found
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "2rem" }}>
        <div className="container grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {stations.map((station) => (
            <article key={station.id} className="card" style={{ padding: "1.25rem", display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className={`badge ${station.status === "ACTIVE" ? "success" : "warning"}`}>
                  {station.status}
                </span>
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  {station.metricSource === "live" ? "Live" : station.metricSource === "icecast" ? "Icecast" : "Offline"}
                </span>
              </div>

              <div>
                <h2 style={{ margin: "0 0 0.25rem", fontSize: "1.1rem" }}>{station.name}</h2>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  {station.description ?? "Internet radio station"}
                </p>
              </div>

              <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem" }}>
                <span><strong>{station.genre ?? "Mixed"}</strong></span>
                <span className="muted">{station.language}</span>
                {station.country ? <span className="muted">{station.country}</span> : null}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div className="stat-card" style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <span className="stat-label">Listeners</span>
                  <span className="stat-value" style={{ fontSize: "1.25rem" }}>{station.currentListeners}</span>
                </div>
                <div className="stat-card" style={{ padding: "0.6rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <span className="stat-label">Peak</span>
                  <span className="stat-value" style={{ fontSize: "1.25rem" }}>{station.peakListeners}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Link href={`/stations/${station.slug}`} className="btn primary" style={{ flex: 1 }}>
                  Listen
                </Link>
                <a className="btn secondary" href={station.streamUrl} target="_blank" rel="noreferrer">
                  Stream
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {stations.length === 0 ? (
        <section style={{ padding: "0 0 2rem" }}>
          <div className="container">
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No stations found</h2>
              <p className="muted" style={{ margin: "0 0 1rem" }}>
                Try removing some filters or check back later.
              </p>
              <Link href="/explore" className="btn secondary">Clear filters</Link>
            </div>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
