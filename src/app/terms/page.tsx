import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Terms of Service – OpenRadio",
  description: "Terms governing your use of OpenRadio Cloud.",
};

const sections = [
  {
    title: "Acceptance",
    body: "By creating an account or using OpenRadio Cloud, you agree to these terms. If you are deploying your own instance, these terms apply to the reference deployment only — each operator sets their own terms for their instance.",
  },
  {
    title: "Your Content",
    body: "You retain full ownership of all audio files, station metadata, and other content you upload or create on the platform. By publishing a station, you grant other users the right to listen to your stream. You are solely responsible for ensuring you hold the necessary rights and licences for any audio content you broadcast.",
  },
  {
    title: "Acceptable Use",
    body: "You must not use OpenRadio Cloud to broadcast content that infringes copyright, is unlawful, abusive, or harmful. Broadcasting copyrighted music without the appropriate performance licence (e.g. from ASCAP, BMI, SESAC, PRS, or equivalent) is your responsibility as the broadcaster.",
  },
  {
    title: "Service Availability",
    body: "OpenRadio Cloud is open-source software provided as-is. No uptime guarantee is made. The software and any reference deployment may be modified, suspended, or discontinued at any time.",
  },
  {
    title: "Limitation of Liability",
    body: "To the fullest extent permitted by law, the OpenRadio Cloud contributors and operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform or the software.",
  },
  {
    title: "Open Source",
    body: "The source code is released under the MIT Licence. You are free to fork, modify, and self-host your own instance. Contributions to the project are welcome via the public GitHub repository.",
  },
  {
    title: "Changes to These Terms",
    body: "We may update these terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the revised terms.",
  },
];

export default function TermsPage() {
  return (
    <main style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <SiteHeader />
      <section style={{ padding: "3rem 0 5rem" }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brand)", margin: "0 0 0.5rem" }}>Legal</p>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", margin: "0 0 0.4rem" }}>Terms of Service</h1>
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
            <Link href="/privacy" className="btn btn-secondary btn-sm">Privacy Policy</Link>
            <Link href="/cookies" className="btn btn-secondary btn-sm">Cookie Policy</Link>
            <Link href="/" className="btn btn-secondary btn-sm">← Home</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
