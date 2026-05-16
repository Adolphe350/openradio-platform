import Link from "next/link";

interface SiteHeaderProps {
  showAuthActions?: boolean;
}

export function SiteHeader({ showAuthActions = true }: SiteHeaderProps) {
  return (
    <nav className="site-nav">
      <div className="container">
        <Link href="/" className="nav-logo">
          <div className="nav-logo-icon">O</div>
          <span className="nav-logo-name">openradio</span>
        </Link>

        <div className="nav-links">
          <Link href="/create" className="nav-link">
            Create a Station
          </Link>
          <Link href="/explore" className="nav-link">
            Explore
          </Link>
          <Link href="/music" className="nav-link">
            Music
          </Link>
          <Link href="/news" className="nav-link">
            News
          </Link>

          <div className="nav-dropdown nav-hide-mobile">
            <button className="nav-link">By Genre ↓</button>
            <div className="nav-dropdown-menu">
              <Link href="/explore?genre=pop" className="nav-dropdown-item">
                Pop
              </Link>
              <Link href="/explore?genre=rock" className="nav-dropdown-item">
                Rock
              </Link>
              <Link href="/explore?genre=electronic" className="nav-dropdown-item">
                Electronic
              </Link>
              <Link href="/explore?genre=hip-hop" className="nav-dropdown-item">
                Hip Hop
              </Link>
              <Link href="/explore?genre=jazz" className="nav-dropdown-item">
                Jazz
              </Link>
              <div className="nav-divider"></div>
              <Link href="/explore?genre=classical" className="nav-dropdown-item">
                Classical
              </Link>
              <Link href="/explore?genre=country" className="nav-dropdown-item">
                Country
              </Link>
              <Link href="/explore?genre=talk" className="nav-dropdown-item">
                Talk Radio
              </Link>
              <Link href="/explore?genre=news" className="nav-dropdown-item">
                News
              </Link>
              <Link href="/explore?genre=sports" className="nav-dropdown-item">
                Sports
              </Link>
            </div>
          </div>
        </div>

        {showAuthActions && (
          <div className="nav-right">
            <Link href="/sign-in" className="btn btn-sm btn-secondary">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-sm btn-primary">
              Get started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
