"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon, LogoMark, type IconName } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export type SidebarStation = { id: string; name: string; slug: string; status: string };

type Props = {
  userName: string;
  userEmail: string;
  isSuperAdmin: boolean;
  stations: SidebarStation[];
  signOut: () => Promise<void>;
};

type NavItem = {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  needsStation?: boolean;
  external?: boolean;
  active: boolean;
};

const STATUS_LABEL: Record<string, string> = { ACTIVE: "On air", PAUSED: "Paused", DRAFT: "Off air" };

export function StudioSidebar({ userName, userEmail, isSuperAdmin, stations, signOut }: Props) {
  const pathname = usePathname() ?? "/dashboard";
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const pathStation = pathname.match(/^\/dashboard\/stations\/([^/?#]+)/)?.[1];
  const queryStation = searchParams?.get("stationId") ?? undefined;
  const wanted = pathStation && pathStation !== "new" ? pathStation : queryStation;
  const station = stations.find((s) => s.id === wanted) ?? stations[0] ?? null;
  const inStation = Boolean(station && pathStation === station.id);
  const tab = searchParams?.get("tab") ?? "overview";
  const onScheduler = inStation && pathname.endsWith("/scheduler");
  const onRoyalties = inStation && pathname.endsWith("/royalties");
  const onStationRoot = inStation && !onScheduler && !onRoyalties;

  const base = station ? `/dashboard/stations/${station.id}` : "/dashboard/stations/new";
  const st = (suffix: string) => (station ? `${base}${suffix}` : "/dashboard/stations/new");

  const primary: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", href: "/dashboard", active: pathname === "/dashboard" },
    { key: "live", label: "Live", icon: "live", href: st("?tab=overview"), needsStation: true, active: onStationRoot && tab === "overview" },
    { key: "library", label: "Library", icon: "library", href: "/dashboard/music", active: pathname.startsWith("/dashboard/music") || (onStationRoot && tab === "tracks") },
    { key: "playlists", label: "Playlists", icon: "playlist", href: st("?tab=autodj"), needsStation: true, active: onStationRoot && tab === "autodj" },
    { key: "schedule", label: "Schedule", icon: "schedule", href: st("/scheduler"), needsStation: true, active: onScheduler },
    { key: "embed", label: "Embed & share", icon: "embed", href: st("?tab=widget"), needsStation: true, active: onStationRoot && tab === "widget" },
    { key: "listeners", label: "Listeners", icon: "listeners", href: "/dashboard/analytics", active: pathname.startsWith("/dashboard/analytics") },
    { key: "settings", label: "Settings", icon: "settings", href: st("?tab=settings"), needsStation: true, active: onStationRoot && tab === "settings" },
  ];

  const tools: NavItem[] = [
    { key: "studio", label: "Browser studio", icon: "mic", href: station ? `/dashboard/studio?stationId=${station.id}` : "/dashboard/studio", active: pathname.startsWith("/dashboard/studio") },
    { key: "podcasts", label: "Podcasts", icon: "podcast", href: "/dashboard/podcasts", active: pathname.startsWith("/dashboard/podcasts") },
    { key: "advanced", label: "Relays & geo", icon: "advanced", href: st("?tab=ctl"), needsStation: true, active: onStationRoot && tab === "ctl" },
    { key: "royalties", label: "Royalties", icon: "royalty", href: st("/royalties"), needsStation: true, active: onRoyalties },
  ];

  const account: NavItem[] = [
    { key: "account", label: "Account", icon: "users", href: "/dashboard/settings", active: pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/team") },
    { key: "billing", label: "Billing", icon: "billing", href: "/dashboard/settings/billing", active: pathname.startsWith("/dashboard/settings/billing") },
    ...(isSuperAdmin ? [{ key: "admin", label: "Super admin", icon: "admin" as IconName, href: "/admin", active: false }] : []),
  ];

  useEffect(() => {
    setOpen(false);
    setPickerOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPickerOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const status = station?.status ?? "NONE";
  const lamp = status === "ACTIVE" ? "on" : status === "PAUSED" ? "paused" : "off";

  const renderItem = (item: NavItem) => {
    const disabled = item.needsStation && !station;
    return (
      <li key={item.key}>
        <Link
          href={item.href}
          className={`studio-nav-link${item.active ? " is-active" : ""}${disabled ? " is-muted" : ""}`}
          aria-current={item.active ? "page" : undefined}
          title={disabled ? `${item.label}: create a station first` : item.label}
        >
          <Icon name={item.icon} size={18} />
          <span className="studio-nav-label">{item.label}</span>
        </Link>
      </li>
    );
  };

  const panel = (
    <>
      <div className="studio-side-head">
        <Link href="/dashboard" className="studio-brand" aria-label="OpenRadio Cloud dashboard">
          <LogoMark size={30} />
          <span className="studio-brand-text">
            OpenRadio<span>Cloud</span>
          </span>
        </Link>
      </div>

      <div className="studio-onair-block">
        <div className={`onair-pill onair-${lamp}`} role="status" aria-live="polite">
          <span className="onair-lamp" aria-hidden="true" />
          <span className="onair-text">{station ? (status === "ACTIVE" ? "ON AIR" : status === "PAUSED" ? "PAUSED" : "OFF AIR") : "NO STATION"}</span>
        </div>

        {station ? (
          <div className="station-picker" ref={pickerRef}>
            <button
              type="button"
              className="station-picker-btn"
              aria-haspopup="listbox"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((v) => !v)}
            >
              <span className="station-picker-art" aria-hidden="true">{station.name.charAt(0).toUpperCase()}</span>
              <span className="station-picker-text">
                <span className="station-picker-name">{station.name}</span>
                <span className="station-picker-meta">/{station.slug}</span>
              </span>
              <Icon name="chevron-down" size={16} />
            </button>
            {pickerOpen ? (
              <div className="station-picker-menu" role="listbox" aria-label="Switch station">
                {stations.map((s) => (
                  <Link
                    key={s.id}
                    role="option"
                    aria-selected={s.id === station.id}
                    href={`/dashboard/stations/${s.id}?tab=overview`}
                    className={`station-picker-option${s.id === station.id ? " is-current" : ""}`}
                  >
                    <span className={`mini-lamp lamp-${s.status === "ACTIVE" ? "on" : s.status === "PAUSED" ? "paused" : "off"}`} aria-hidden="true" />
                    <span className="station-picker-option-name">{s.name}</span>
                    <span className="station-picker-option-status">{STATUS_LABEL[s.status] ?? s.status}</span>
                  </Link>
                ))}
                <Link href="/dashboard/stations/new" className="station-picker-option station-picker-new">
                  <Icon name="plus" size={16} /> New station
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/dashboard/stations/new" className="station-picker-btn station-picker-create">
            <Icon name="plus" size={16} />
            <span className="station-picker-text"><span className="station-picker-name">Create your station</span></span>
          </Link>
        )}
      </div>

      <nav className="studio-nav" aria-label="Station admin">
        <ul>{primary.map(renderItem)}</ul>
        <p className="studio-nav-group">Tools</p>
        <ul>{tools.map(renderItem)}</ul>
        <p className="studio-nav-group">Account</p>
        <ul>{account.map(renderItem)}</ul>
      </nav>

      <div className="studio-side-foot">
        <div className="studio-user">
          <span className="studio-avatar" aria-hidden="true">{initials || "OR"}</span>
          <span className="studio-user-text">
            <span className="studio-user-name">{userName}</span>
            <span className="studio-user-mail">{userEmail}</span>
          </span>
        </div>
        <div className="studio-foot-actions">
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className="studio-icon-btn" aria-label="Sign out" title="Sign out">
              <Icon name="logout" size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <>
      <header className="studio-mobilebar">
        <button
          type="button"
          className="studio-icon-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="studio-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "x" : "menu"} size={20} />
        </button>
        <Link href="/dashboard" className="studio-brand" aria-label="OpenRadio Cloud dashboard">
          <LogoMark size={26} />
          <span className="studio-brand-text">OpenRadio<span>Cloud</span></span>
        </Link>
        <span className={`onair-pill onair-${lamp} onair-compact`}>
          <span className="onair-lamp" aria-hidden="true" />
          <span className="onair-text">{status === "ACTIVE" ? "ON AIR" : status === "PAUSED" ? "PAUSED" : "OFF"}</span>
        </span>
      </header>

      <div className={`studio-scrim${open ? " is-open" : ""}`} aria-hidden="true" onClick={() => setOpen(false)} />

      <aside id="studio-drawer" className={`studio-sidebar${open ? " is-open" : ""}`} aria-label="Studio menu">
        {panel}
      </aside>
    </>
  );
}
