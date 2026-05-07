import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <SiteHeader />
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 1rem" }}>
        <div style={{ textAlign: "center", display: "grid", gap: "1rem", justifyItems: "center" }}>
          <div style={{ fontSize: "5rem", lineHeight: 1 }}>📻</div>
          <h1 style={{ fontSize: "clamp(2rem,6vw,3.5rem)", margin: 0 }}>404</h1>
          <p style={{ fontSize: "1.05rem", color: "var(--text-muted)", margin: 0, maxWidth: "40ch" }}>
            This page doesn&apos;t exist. It may have been moved, deleted, or you typed the wrong URL.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/" className="btn btn-primary">Go home</Link>
            <Link href="/explore" className="btn btn-secondary">Explore stations</Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
