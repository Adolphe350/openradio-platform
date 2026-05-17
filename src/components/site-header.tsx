"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface SiteHeaderProps {
  showAuthActions?: boolean;
}

const genres = [
  ["Pop", "pop"],
  ["Rock", "rock"],
  ["Electronic", "electronic"],
  ["Hip Hop", "hip-hop"],
  ["Jazz", "jazz"],
  ["Classical", "classical"],
  ["Country", "country"],
  ["Talk Radio", "talk"],
  ["News", "news"],
  ["Sports", "sports"],
] as const;

export function SiteHeader({ showAuthActions = true }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 960) {
        setMobileMenuOpen(false);
        setOpenDropdown(null);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown((current) => (current === name ? null : name));
  };

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  return (
    <nav className="site-nav">
      <div className="container site-nav-shell">
        <div className="site-nav-inner">
          <Link href="/" className="nav-logo" onClick={closeMenus}>
            <div className="nav-logo-icon">O</div>
            <span className="nav-logo-name">openradio</span>
          </Link>

          <button
            type="button"
            className="nav-menu-toggle"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="site-nav-menu"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setOpenDropdown(null);
            }}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={`nav-menu${mobileMenuOpen ? " is-open" : ""}`} id="site-nav-menu">
            <div className="nav-menu-primary">
              <Link href="/sign-up" className="nav-link" onClick={closeMenus}>
                Create a Station
              </Link>
              <Link href="/explore" className="nav-link" onClick={closeMenus}>
                Explore
              </Link>
              <Link href="/explore?genre=Music" className="nav-link" onClick={closeMenus}>
                Music
              </Link>
              <Link href="/explore?genre=News" className="nav-link" onClick={closeMenus}>
                News
              </Link>

              <div className={`nav-dropdown${openDropdown === "genre" ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="nav-link nav-dropdown-trigger"
                  aria-expanded={openDropdown === "genre"}
                  onClick={() => toggleDropdown("genre")}
                >
                  By Genre ↓
                </button>
                <div className="nav-dropdown-menu">
                  {genres.map(([label, value], index) => (
                    <Link
                      key={value}
                      href={`/explore?genre=${encodeURIComponent(value)}`}
                      className="nav-dropdown-item"
                      onClick={closeMenus}
                    >
                      {label}
                    </Link>
                  ))}
                  <div className="nav-divider" />
                  <Link href="/explore?genre=religious" className="nav-dropdown-item" onClick={closeMenus}>
                    Religious
                  </Link>
                </div>
              </div>
            </div>

            {showAuthActions ? (
              <div className="nav-right">
                <Link href="/sign-in" className="btn btn-sm btn-secondary" onClick={closeMenus}>
                  Sign in
                </Link>
                <Link href="/sign-up" className="btn btn-sm btn-primary" onClick={closeMenus}>
                  Get started
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
