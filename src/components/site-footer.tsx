import Link from "next/link";
import { LogoMark } from "@/components/icons";

export function SiteFooter() {
  return (
    <footer className="pub-footer">
      <div className="pub-wrap pub-footer-grid">
        <div className="pub-footer-brand">
          <Link href="/" className="studio-brand" aria-label="OpenRadio Cloud home">
            <LogoMark size={28} />
            <span className="studio-brand-text">OpenRadio<span>Cloud</span></span>
          </Link>
          <p>
            Internet radio hosting: a music library, AutoDJ playlists, a weekly schedule, live Icecast input and a player you can embed anywhere.
          </p>
        </div>

        <nav aria-label="Listen">
          <h2>Listen</h2>
          <ul>
            <li><Link href="/explore">Explore stations</Link></li>
          </ul>
        </nav>

        <nav aria-label="Broadcast">
          <h2>Broadcast</h2>
          <ul>
            <li><Link href="/sign-up">Get started</Link></li>
            <li><Link href="/streaming">Live streaming</Link></li>
            <li><Link href="/automation">AutoDJ &amp; scheduling</Link></li>
            <li><Link href="/pricing">Pricing</Link></li>
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2>Legal</h2>
          <ul>
            <li><Link href="/terms">Terms of service</Link></li>
            <li><Link href="/privacy">Privacy policy</Link></li>
            <li><Link href="/cookies">Cookies</Link></li>
          </ul>
        </nav>
      </div>

      <div className="pub-wrap pub-footer-bottom">
        <p>© {new Date().getFullYear()} OpenRadio Cloud</p>
        <p>Built by Iraady Ltd · <a href="https://iraady.com">iraady.com</a></p>
      </div>
    </footer>
  );
}
