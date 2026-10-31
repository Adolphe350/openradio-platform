import Link from "next/link";
import { LogoMark } from "@/components/icons";

type Props = {
  title: string;
  lede: string;
  sideTitle: string;
  sideText: string;
  children: React.ReactNode;
};

/** Waveform built once on the server: a deterministic, speech-like envelope. */
function wavePath(width: number, height: number, seed: number) {
  const mid = height / 2;
  const pts: string[] = [];
  for (let x = 0; x <= width; x += 6) {
    const env = 0.35 + 0.65 * Math.abs(Math.sin((x + seed) / 140)) * Math.abs(Math.sin((x + seed * 3) / 37));
    const y = mid + Math.sin((x + seed) / 9) * env * (height * 0.42) * (x % 12 === 0 ? 1 : -0.8);
    pts.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

export function AuthFrame({ title, lede, sideTitle, sideText, children }: Props) {
  const w = 1200;
  const h = 220;
  return (
    <div className="auth-studio">
      <section className="auth-studio-side" aria-hidden="false">
        <Link href="/" className="auth-studio-brand" aria-label="OpenRadio Cloud home">
          <LogoMark size={32} />
          <span className="studio-brand-text">OpenRadio<span>Cloud</span></span>
        </Link>

        <div className="auth-studio-sign" aria-hidden="true">
          <span className="onair-bulb is-on" />
          <span>ON AIR</span>
        </div>

        <div className="auth-wave" aria-hidden="true">
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" focusable="false">
            <line x1="0" y1={h / 2} x2={w} y2={h / 2} className="auth-wave-axis" />
            <path d={wavePath(w, h, 40)} className="auth-wave-ghost" />
            <path d={wavePath(w, h, 0)} className="auth-wave-line" pathLength={1} />
            <rect x="0" y="0" width="2" height={h} className="auth-wave-head" />
          </svg>
          <div className="auth-wave-ticks mono">
            <span>00:00</span><span>00:15</span><span>00:30</span><span>00:45</span><span>01:00</span>
          </div>
        </div>

        <div className="auth-studio-copy">
          <h2>{sideTitle}</h2>
          <p>{sideText}</p>
        </div>
      </section>

      <main className="auth-studio-main">
        <div className="auth-card">
          <Link href="/" className="auth-card-brand" aria-label="OpenRadio Cloud home">
            <LogoMark size={28} />
            <span className="studio-brand-text">OpenRadio<span>Cloud</span></span>
          </Link>
          <h1>{title}</h1>
          <p className="auth-lede">{lede}</p>
          {children}
        </div>
        <p className="auth-foot">Built by Iraady Ltd · <a href="https://iraady.com">iraady.com</a></p>
      </main>
    </div>
  );
}

export function authErrorText(error?: string) {
  if (!error) return null;
  const known: Record<string, string> = {
    invalid: "Invalid email or password.",
    credentials: "Invalid email or password.",
    server: "Server error. Please try again.",
    "email-exists": "An account with this email already exists.",
    "weak-password": "Password must be at least 8 characters.",
  };
  if (known[error]) return known[error];
  const text = error.slice(0, 160);
  return text.endsWith(".") ? text : `${text}.`;
}
