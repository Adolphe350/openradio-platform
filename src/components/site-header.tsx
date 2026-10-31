"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, LogoMark } from "@/components/icons";

interface SiteHeaderProps {
  showAuthActions?: boolean;
}

const links = [
  { href: "/explore", label: "Listen" },
  { href: "/streaming", label: "Go live" },
  { href: "/automation", label: "AutoDJ" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader({ showAuthActions = true }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="pub-header">
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="pub-wrap pub-header-row">
        <Link href="/" className="studio-brand" aria-label="OpenRadio Cloud home">
          <LogoMark size={30} />
          <span className="studio-brand-text">OpenRadio<span>Cloud</span></span>
        </Link>

        <button
          type="button"
          className="studio-icon-btn pub-menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="pub-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "x" : "menu"} size={20} />
        </button>

        <nav id="pub-nav" className={`pub-nav${open ? " is-open" : ""}`} aria-label="Main">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="pub-nav-link" aria-current={pathname === l.href ? "page" : undefined}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {showAuthActions ? (
            <div className="pub-nav-actions">
              <Link href="/sign-in" className="btn btn-secondary btn-sm">Sign in</Link>
              <Link href="/sign-up" className="btn btn-primary btn-sm">Get started</Link>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
