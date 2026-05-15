import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getExploreFilters, getExploreStations, parseExploreSearchParams, type ExploreStation } from "@/lib/explore";

export const metadata = {
  title: "Explore Radio Stations",
  description: "Discover live radio stations from around the world. Browse by genre, language, and country.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const trendingSearches = ["united states", "brazil", "mexico", "hip hop", "news", "christian", "jazz", "reggaeton", "80s", "pop"];

function stationColor(id: string) {
  const h1 = (id.charCodeAt(0) * 47 + id.charCodeAt(1) * 31) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg,hsl(${h1},55%,48%),hsl(${h2},60%,35%))`;
}

function StationCard({ s }: { s: ExploreStation }) {
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

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "1.5rem 0 0" }}>
        <div className="container">
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 1rem" }}>Explore</h1>

          {/* Tabs: All / Radio */}
          <div className="tabs">
            <Link href="/explore" className={`tab${!params.q && !params.genre && !params.language && !params.country ? " active" : ""}`}>All</Link>
            <Link href="/explore?genre=Music" className={`tab${params.genre === "Music" ? " active" : ""}`}>Radio</Link>
            <Link href="/explore?genre=Podcast" className="tab">Podcasts</Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "1.5rem 0 4rem" }}>

        {/* ── Search bar ─────────────────────────────────────────── */}
        <form method="GET" className="explore-search-form" style={{ marginBottom: "1.25rem" }}>
          <div className="explore-search-box" style={{
            display: "flex", gap: 0, background: "var(--bg)",
            border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)",
            overflow: "hidden", boxShadow: "var(--shadow-sm)",
          }}>
            <input
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Search stations…"
              style={{
                flex: 1, border: "none", padding: "0.75rem 1rem",
                fontSize: "0.9rem", background: "transparent", outline: "none",
                color: "var(--text)",
              }}
            />
            <button
              type="submit"
              style={{
                background: "var(--brand)", color: "#fff", border: "none",
                padding: "0 1.25rem", fontWeight: 600, fontSize: "0.875rem",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Search
            </button>
          </div>
        </form>

        {/* ── Trending searches ───────────────────────────────────── */}
        {!hasFilter && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>Trending Searches:</span>
            {trendingSearches.map((t) => (
              <Link key={t} href={`/explore?q=${encodeURIComponent(t)}`} className="trending-tag">{t}</Link>
            ))}
          </div>
        )}

        {/* ── Advanced filters (when active) ─────────────────────── */}
        {hasFilter && (
          <form method="GET" className="explore-filter-card" style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem", marginBottom: "1.5rem" }}>
            <div className="explore-filter-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.75rem" }}>
              <div className="field">
                <label htmlFor="genre">Genre</label>
                <select id="genre" name="genre" defaultValue={params.genre ?? ""}>
                  <option value="">All genres</option>
                  {facets.genres.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="language">Language</label>
                <select id="language" name="language" defaultValue={params.language ?? ""}>
                  <option value="">All languages</option>
                  {facets.languages.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="country">Country</label>
                <select id="country" name="country" defaultValue={params.country ?? ""}>
                  <option value="">All countries</option>
                  {facets.countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sort">Sort by</label>
                <select id="sort" name="sort" defaultValue={filters.sort}>
                  <option value="trending">Trending</option>
                  <option value="recent">Recently updated</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
              <div className="explore-filter-actions" style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
                <button className="btn btn-primary btn-sm" type="submit">Apply</button>
                <Link href="/explore" className="btn btn-secondary btn-sm">Reset</Link>
              </div>
            </div>
            {params.q && <input type="hidden" name="q" value={params.q} />}
          </form>
        )}

        {/* ── No-filter home view ─────────────────────────────────── */}
        {!hasFilter && (
          <>
            {trending.length > 0 && (
              <section style={{ marginBottom: "2.5rem" }}>
                <div className="section-row">
                  <h2 className="section-title">Trending Stations</h2>
                  <Link href="/explore?sort=trending" style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 600 }}>Show all</Link>
                </div>
                <div className="grid-cards">
                  {trending.map((s) => <StationCard key={s.id} s={s} />)}
                </div>
              </section>
            )}

            {top.length > 0 && (
              <section style={{ marginBottom: "2.5rem" }}>
                <div className="section-row">
                  <h2 className="section-title">Top Stations</h2>
                  <Link href="/explore?sort=recent" style={{ fontSize: "0.85rem", color: "var(--brand)", fontWeight: 600 }}>Show all</Link>
                </div>
                <div className="grid-cards">
                  {top.map((s) => <StationCard key={s.id} s={s} />)}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Filter results ──────────────────────────────────────── */}
        {hasFilter && (
          <section>
            <div className="section-row">
              <div>
                <h2 className="section-title">
                  {params.genre ? `${params.genre} Radio` : params.q ? `Results for "${params.q}"` : "All Stations"}
                </h2>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  {stations.length} station{stations.length !== 1 ? "s" : ""} found
                </p>
              </div>
            </div>

            {stations.length > 0 ? (
              <div className="grid-cards">
                {stations.map((s) => <StationCard key={s.id} s={s} />)}
              </div>
            ) : (
              <div className="empty-state card">
                <span className="empty-icon">📻</span>
                <h3 style={{ margin: 0 }}>No stations found</h3>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Try adjusting your filters or search term.</p>
                <Link href="/explore" className="btn btn-secondary btn-sm">Clear filters</Link>
              </div>
            )}
          </section>
        )}

        {/* ── All stations (no filter, bottom) ───────────────────── */}
        {!hasFilter && stations.length > 0 && (
          <section>
            <div className="section-row">
              <h2 className="section-title">All Stations</h2>
            </div>
            <div className="grid-cards">
              {stations.map((s) => <StationCard key={s.id} s={s} />)}
            </div>
          </section>
        )}

        {!hasFilter && stations.length === 0 && trending.length === 0 && (
          <div className="empty-state card">
            <span className="empty-icon">📻</span>
            <h3 style={{ margin: 0 }}>No stations yet</h3>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Be the first to create and publish a station.
            </p>
            <Link href="/sign-up" className="btn btn-primary">Create a Station</Link>
          </div>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
