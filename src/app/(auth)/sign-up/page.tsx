import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import { signUpAction } from "../auth-actions";

type Props = { searchParams: Promise<{ error?: string }> };

export const metadata = { title: "Create account – OpenRadio" };

export default async function SignUpPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (session) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="auth-page">
      {/* Left — dark panel */}
      <div className="auth-image-panel">
        <div style={{ display: "grid", gap: "1.5rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", justifyContent: "center", textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "1.1rem" }}>
              O
            </div>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>openradio</span>
          </Link>

          <div
            style={{
              width: 220, height: 220, borderRadius: "50%",
              background: "rgba(0,200,160,0.12)",
              border: "2px solid rgba(0,200,160,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "5rem", margin: "0 auto",
            }}
          >
            🎙️
          </div>

          <div>
            <h2 style={{ color: "#fff", fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
              Start broadcasting in minutes
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", margin: 0, fontSize: "0.9rem", maxWidth: "34ch", marginInline: "auto" }}>
              Free account. No credit card. Go live with your first station today.
            </p>
          </div>

          {/* Feature list */}
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem", textAlign: "left" }}>
            {[
              "Live broadcasting with any encoder",
              "AutoDJ 24/7 playlist automation",
              "Public station page & discovery",
              "Listener analytics dashboard",
            ].map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "rgba(255,255,255,0.7)" }}>
                <span style={{ color: "var(--brand)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ position: "absolute", top: "10%", right: "5%", width: 200, height: 200, borderRadius: "50%", background: "rgba(0,200,160,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "8%", width: 150, height: 150, borderRadius: "50%", background: "rgba(59,130,246,0.08)", pointerEvents: "none" }} />
      </div>

      {/* Right — form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.4rem" }}>Create your account</h1>
          <p style={{ color: "var(--text-muted)", margin: "0 0 2rem", fontSize: "0.9rem" }}>
            Free forever. Open-source. No vendor lock-in.
          </p>

          <form action={signUpAction} style={{ display: "grid", gap: "1rem" }}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name" name="name" type="text"
                placeholder="Your name"
                required minLength={2} maxLength={60}
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email" name="email" type="email"
                placeholder="you@example.com"
                required autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password"
                required minLength={8}
                autoComplete="new-password"
              />
              <span className="hint">Min. 8 characters, one uppercase, one number.</span>
            </div>

            {error && (
              <div className="alert alert-error">
                {decodeURIComponent(error)}
              </div>
            )}

            <button className="btn btn-primary btn-full" type="submit" style={{ marginTop: "0.25rem" }}>
              Create Free Account
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            By signing up, you agree to our terms of service.
          </p>

          <p style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link href="/sign-in" style={{ color: "var(--brand)", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
