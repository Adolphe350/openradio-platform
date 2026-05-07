import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getExploreFilters, getExploreStations, parseExploreSearchParams } from "@/lib/explore";

export const metadata = {
  title: "Explore stations",
  description: "Find active OpenRadio stations by name, genre, language, and country."
};

type ExplorePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const sortOptions = [
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recently updated" },
  { value: "name", label: "Name (A-Z)" }
] as const;

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = parseExploreSearchParams(await searchParams);
  const filters = {
    ...params,
    sort: params.sort ?? "trending",
    limit: 30
  };

  const [stations, facetOptions] = await Promise.all([getExploreStations(filters), getExploreFilters()]);

  return (
    <main>
      <SiteHeader />

      <section style={{ padding: "2.5rem 0 1.5rem" }}>
        <div className="container" style={{ display: "grid", gap: "0.8rem" }}>
          <span className="badge">Listener discovery</span>
          <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 4.5vw, 2.7rem)" }}>Explore public stations</h1>
          <p className="muted" style={{ margin: 0, maxWidth: "70ch" }}>
            Search by name and filter by genre, language, and country. Results only include discoverable stations
            currently marked active or paused.
          </p>
        </div>
      </section>

      <section style={{ padding: "0 0 1.5rem" }}>
        <div className="container card" style={{ padding: "1rem" }}>
          <form method="GET" className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
            <div className="field" style={{ gridColumn: "span 2" }}>
              <label htmlFor="q">Search stations</label>
              <input
                id="q"
                className="input"
                type="search"
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Station name, genre, or description"
              />
            </div>

            <div className="field">
              <label htmlFor="genre">Genre</label>
              <select id="genre" name="genre" defaultValue={params.genre ?? ""}>
                <option value="">All genres</option>
                {facetOptions.genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="language">Language</label>
              <select id="language" name="language" defaultValue={params.language ?? ""}>
                <option value="">All languages</option>
                {facetOptions.languages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="country">Country</label>
              <select id="country" name="country" defaultValue={params.country ?? ""}>
                <option value="">All countries</option>
                {facetOptions.countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="sort">Sort</label>
              <select id="sort" name="sort" defaultValue={filters.sort}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "0.55rem", flexWrap: "wrap" }}>
              <button className="btn primary" type="submit">
                Apply filters
              </button>
              <Link href="/explore" className="btn secondary">
                Reset
              </Link>
            </div>
          </form>
        </div>
      </section>

      <section style={{ padding: "0 0 1.25rem" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <p className="muted" style={{ margin: 0 }}>
            {stations.length} station{stations.length === 1 ? "" : "s"} found
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Public API: <code>/api/explore</code>
          </p>
        </div>
      </section>

      <section style={{ paddingBottom: "1rem" }}>
        <div className="container grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(245px, 1fr))" }}>
          {stations.map((station) => (
            <article key={station.id} className="card" style={{ padding: "1rem", display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem" }}>
                <span className="badge">{station.status}</span>
                <p className="muted" style={{ margin: 0, fontSize: "0.78rem" }}>
                  {station.metricSource === "live" ? "Live stats" : "Sample stats"}
                </p>
              </div>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>{station.name}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {station.description ?? "Independent internet radio station"}
              </p>
              <p style={{ margin: 0, fontSize: "0.88rem" }}>
                Genre: <strong>{station.genre ?? "Mixed"}</strong>
              </p>
              <p style={{ margin: 0, fontSize: "0.88rem" }}>
                Language: <strong>{station.language}</strong>
                {station.country ? (
                  <>
                    {" "}· Country: <strong>{station.country}</strong>
                  </>
                ) : null}
              </p>
              <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.45rem" }}>
                <article className="card" style={{ padding: "0.55rem" }}>
                  <p className="muted" style={{ margin: 0, fontSize: "0.74rem" }}>
                    Current listeners
                  </p>
                  <strong style={{ fontSize: "1.05rem" }}>{station.currentListeners}</strong>
                </article>
                <article className="card" style={{ padding: "0.55rem" }}>
                  <p className="muted" style={{ margin: 0, fontSize: "0.74rem" }}>
                    Peak listeners
                  </p>
                  <strong style={{ fontSize: "1.05rem" }}>{station.peakListeners}</strong>
                </article>
              </div>
              <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                <Link href={`/stations/${station.slug}`} className="btn secondary">
                  Open station
                </Link>
                <a className="btn secondary" href={station.streamUrl} target="_blank" rel="noreferrer">
                  Stream URL
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {stations.length === 0 ? (
        <section style={{ padding: "0 0 1.5rem" }}>
          <div className="container card" style={{ padding: "1rem" }}>
            <h2 style={{ marginBottom: "0.35rem" }}>No stations matched your filters</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Try removing one or more filters, or check back after creators publish new stations.
            </p>
            <Link href="/explore" className="btn secondary">
              Clear filters
            </Link>
          </div>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
