import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Privacy Policy – OpenRadio",
  description: "How OpenRadio Cloud handles your data.",
};

const sections = [
  {
    title: "What We Collect",
    body: "We collect your name, email address, and a hashed password when you register. We also store station metadata you enter (name, description, genre, country). Server logs may record IP addresses and user-agent strings for session management and security purposes.",
  },
  {
    title: "How We Use It",
    body: "Your account information is used solely to authenticate you and operate the service. Station data powers the public Explore directory. We do not sell your data, share it with advertisers, or use it for any purpose beyond running the platform.",
  },
  {
    title: "Audio Uploads",
    body: "Audio files you upload are stored on your own server infrastructure. OpenRadio Cloud is self-hosted software — your files live on your servers. You retain full ownership of all uploaded content.",
  },
  {
    title: "Cookies & Sessions",
    body: "We use a single HTTP-only session cookie (orc_session) to keep you logged in. No third-party tracking cookies are set. The session expires after 30 days or when you sign out.",
  },
  {
    title: "Data Retention",
    body: "Account and station data are retained until you delete them. You can delete stations from the Danger Zone in the station studio. To delete your account entirely, contact the administrator of your OpenRadio instance.",
  },
  {
    title: "Self-Hosted Instances",
    body: "OpenRadio Cloud is open-source MIT-licensed software. Each operator who deploys their own instance is responsible for their own data practices and must publish their own privacy policy if required by applicable law.",
  },
];

export default function PrivacyPage() {
  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <SiteHeader />
      <section style={{ padding: "3rem 0 5rem" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: "0 0 0.5rem" }}>Legal</p>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", margin: "0 0 0.4rem" }}>Privacy Policy</h1>
            <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.875rem" }}>
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div style={{ display: "grid", gap: "1.25rem" }}>
            {sections.map((s) => (
              <div key={s.title} className="card" style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", margin: "0 0 0.6rem" }}>{s.title}</h2>
                <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.7, fontSize: "0.9rem" }}>{s.body}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <Link href="/terms" className="btn btn-secondary btn-sm">Terms of Service</Link>
            <Link href="/cookies" className="btn btn-secondary btn-sm">Cookie Policy</Link>
            <Link href="/" className="btn btn-secondary btn-sm">← Home</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
