import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top-grid">
          <div className="footer-brand">
            <Link href="/" className="footer-logo">
              <div className="footer-logo-icon">O</div>
              <span>openradio</span>
            </Link>
            <p className="footer-tagline">
              The open-source platform for broadcasting and discovering radio
              stations worldwide. Stream live, create your own station, and
              connect with listeners globally.
            </p>
          </div>

          <div className="footer-col">
            <h4>Listen</h4>
            <div className="footer-links">
              <Link href="/explore">Explore Stations</Link>
              <Link href="/trending">Trending Now</Link>
              <Link href="/genres">Browse Genres</Link>
              <Link href="/podcasts">Podcasts</Link>
            </div>
          </div>

          <div className="footer-col">
            <h4>Create</h4>
            <div className="footer-links">
              <Link href="/sign-up">Sign Up</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/docs/streaming-guide">Streaming Guide</Link>
              <Link href="/docs/api">API Docs</Link>
            </div>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <div className="footer-links">
              <Link href="/about">About Us</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 OpenRadio. Open-source radio streaming platform.</p>
        </div>
      </div>
    </footer>
  );
}
