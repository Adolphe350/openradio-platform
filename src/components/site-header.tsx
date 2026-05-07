import Link from "next/link";

type SiteHeaderProps = {
  showAuthActions?: boolean;
};

const genres = ["Pop","Rock","Hip-Hop","Electronic","Jazz","Classical","R&B","Country","Reggae","Metal","Blues","Soul","Latin","Dance","Indie"];
const locations = ["United States","Brazil","United Kingdom","Mexico","France","Germany","India","Australia","Canada","Spain","Portugal","Nigeria","South Africa","Japan","Argentina"];
const languages = ["English","Spanish","Portuguese","French","Arabic","Hindi","German","Italian","Russian","Japanese","Korean","Dutch","Polish","Turkish","Swedish"];

export function SiteHeader({ showAuthActions = true }: SiteHeaderProps) {
  return (
    <header className="site-nav">
      <div className="container">
        <div className="site-nav-inner">
          {/* Logo */}
          <Link href="/" className="nav-logo">
            <div className="nav-logo-icon">Z</div>
            <span className="nav-logo-name">openradio</span>
          </Link>

          <div className="nav-divider" />

          {/* Create a Station */}
          <Link href="/sign-up" className="nav-link" style={{ fontWeight: 600, color: "var(--text)" }}>
            Create a Station
          </Link>

          {/* Explore */}
          <Link href="/explore" className="nav-link">
            Explore
          </Link>

          {/* Religious */}
          <Link href="/explore?genre=Religious" className="nav-link">
            Religious
          </Link>

          {/* Music */}
          <Link href="/explore?genre=Music" className="nav-link">
            Music
          </Link>

          {/* News */}
          <Link href="/explore?genre=News" className="nav-link">
            News
          </Link>

          {/* By Genre dropdown */}
          <div className="nav-dropdown">
            <button className="nav-link" style={{ cursor: "pointer" }}>
              By Genre ▾
            </button>
            <div className="nav-dropdown-menu" style={{ columnCount: 2, columnGap: "0.25rem", minWidth: "280px" }}>
              {genres.map((g) => (
                <Link key={g} href={`/explore?genre=${encodeURIComponent(g)}`} className="nav-dropdown-item">
                  {g}
                </Link>
              ))}
            </div>
          </div>

          {/* By Location dropdown */}
          <div className="nav-dropdown">
            <button className="nav-link" style={{ cursor: "pointer" }}>
              By Location ▾
            </button>
            <div className="nav-dropdown-menu" style={{ minWidth: "220px" }}>
              {locations.map((l) => (
                <Link key={l} href={`/explore?country=${encodeURIComponent(l)}`} className="nav-dropdown-item">
                  {l}
                </Link>
              ))}
            </div>
          </div>

          {/* By Language dropdown */}
          <div className="nav-dropdown">
            <button className="nav-link" style={{ cursor: "pointer" }}>
              By Language ▾
            </button>
            <div className="nav-dropdown-menu" style={{ minWidth: "200px" }}>
              {languages.map((l) => (
                <Link key={l} href={`/explore?language=${encodeURIComponent(l)}`} className="nav-dropdown-item">
                  {l}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side */}
          {showAuthActions ? (
            <div className="nav-right">
              <Link href="/sign-in" className="nav-link" style={{ padding: "0 0.75rem" }}>
                Log in
              </Link>
              <Link href="/sign-up" className="nav-link-create btn">
                Sign up
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
