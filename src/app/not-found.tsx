import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ padding: "4rem 0" }}>
      <div className="card" style={{ padding: "2rem" }}>
        <span className="badge">404</span>
        <h1 style={{ marginTop: "1rem" }}>Page not found</h1>
        <p className="muted">The page you requested does not exist.</p>
        <Link className="btn primary" href="/" style={{ marginTop: "1rem" }}>
          Back home
        </Link>
      </div>
    </main>
  );
}
