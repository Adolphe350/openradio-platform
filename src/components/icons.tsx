// OpenRadio Cloud line icons: 24px grid, 1.75 stroke, square-ish caps
// (hardware-panel feel). Decorative by default (aria-hidden).
import type { SVGProps } from "react";

export type IconName =
  | "dashboard" | "live" | "library" | "playlist" | "schedule" | "embed" | "listeners"
  | "settings" | "podcast" | "billing" | "admin" | "plus" | "upload" | "play" | "pause"
  | "volume" | "mute" | "signal" | "globe" | "arrow-right" | "arrow-left" | "check"
  | "clock" | "mic" | "wave" | "radio" | "lock" | "sun" | "moon" | "logout" | "users"
  | "chart" | "link" | "code" | "alert" | "spinner" | "chevron-down" | "external" | "advanced"
  | "record" | "search" | "x" | "menu" | "royalty";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="8" height="10" rx="1.5" /><rect x="13" y="3" width="8" height="6" rx="1.5" /><rect x="13" y="11" width="8" height="10" rx="1.5" /><rect x="3" y="15" width="8" height="6" rx="1.5" /></>),
  live: (<><circle cx="12" cy="12" r="2.5" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" /></>),
  library: (<><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>),
  playlist: (<><path d="M3 6h12M3 12h12M3 18h7" /><path d="M17 15.5V9l4 1.5" /><circle cx="15.5" cy="17.5" r="2" /></>),
  schedule: (<><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4M7.5 13.5h3M13.5 13.5h3M7.5 17h3" /></>),
  embed: (<><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" /></>),
  listeners: (<><path d="M3 14v-2a9 9 0 0 1 18 0v2" /><rect x="2.5" y="14" width="4.5" height="7" rx="1.5" /><rect x="17" y="14" width="4.5" height="7" rx="1.5" /></>),
  settings: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>),
  podcast: (<><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M8.5 21.5h7" /></>),
  billing: (<><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6.5 15h4" /></>),
  admin: (<><path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" /><path d="M9 12l2 2 4-4" /></>),
  plus: (<><path d="M12 5v14M5 12h14" /></>),
  upload: (<><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" /><path d="M4 15v4.5h16V15" /></>),
  play: (<><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" /></>),
  pause: (<><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /></>),
  volume: (<><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18.3 6.2a8 8 0 0 1 0 11.6" /></>),
  mute: (<><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>),
  signal: (<><path d="M4 20v-3M9 20v-7M14 20V9M19 20V4" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></>),
  "arrow-right": (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
  "arrow-left": (<><path d="M19 12H5M11 6l-6 6 6 6" /></>),
  check: (<><path d="M4.5 12.5l5 5 10-11" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>),
  mic: (<><rect x="9" y="2.5" width="6" height="12" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" /></>),
  wave: (<><path d="M2 12h2M6 8v8M10 4v16M14 7v10M18 10v4M22 12h-2" /></>),
  radio: (<><rect x="2.5" y="8" width="19" height="13" rx="2" /><path d="M7 8l10-5" /><circle cx="15.5" cy="14.5" r="3" /><path d="M6 12.5h4M6 16h4" /></>),
  lock: (<><rect x="4.5" y="10.5" width="15" height="10.5" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>),
  moon: (<><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" /></>),
  logout: (<><path d="M14 4.5h4.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16.5L5.5 12 10 7.5M5.5 12H15" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.5a6.5 6.5 0 0 1 3 5.5" /></>),
  chart: (<><path d="M3.5 3.5v17h17" /><path d="M7.5 15l4-4.5 3 3 5-6" /></>),
  link: (<><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" /></>),
  code: (<><path d="M8 8l-4 4 4 4M16 8l4 4-4 4" /></>),
  alert: (<><path d="M12 3.5l9.5 16.5h-19z" /><path d="M12 10v4.5M12 17.2v.3" /></>),
  spinner: (<><path d="M12 3a9 9 0 1 0 9 9" /></>),
  "chevron-down": (<><path d="M6 9l6 6 6-6" /></>),
  external: (<><path d="M14 4h6v6M20 4l-9 9M18 14v5.5H4.5V6H10" /></>),
  advanced: (<><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>),
  record: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>),
  x: (<><path d="M6 6l12 12M18 6L6 18" /></>),
  menu: (<><path d="M4 7h16M4 12h16M4 17h16" /></>),
  royalty: (<><path d="M4 20h16M6 16V10M10 16V6M14 16v-4M18 16V8" /></>),
};

export function Icon({ name, size = 18, className, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ? `or-icon ${className}` : "or-icon"}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

/** OpenRadio Cloud mark: an on-air lamp inside broadcast rings. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="or-logomark">
      <rect width="32" height="32" rx="7" fill="#15181E" />
      <path d="M9.5 9.5a9.2 9.2 0 0 0 0 13M22.5 9.5a9.2 9.2 0 0 1 0 13" stroke="#F4F1EA" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".55" />
      <path d="M12.6 12.6a4.8 4.8 0 0 0 0 6.8M19.4 12.6a4.8 4.8 0 0 1 0 6.8" stroke="#F4F1EA" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="16" r="2.6" fill="#E63946" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="or-wordmark">
      <LogoMark />
      <span className="or-wordmark-text">
        OpenRadio<span className="or-wordmark-cloud">Cloud</span>
      </span>
    </span>
  );
}
