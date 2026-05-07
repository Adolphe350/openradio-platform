import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";
import { signInAction } from "../auth-actions";

type Props = { searchParams: Promise<{ error?: string }> };

export const metadata = { title: "Sign in – OpenRadio" };

export default async function SignInPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  if (session) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="auth-page">
      {/* Left — dark image panel */}
      <div className="auth-image-panel">
        <div style={{ display: "grid", gap: "1.5rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", justifyContent: "center", textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "1.1rem" }}>
              Z
            </div>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>openradio</span>
          </Link>

          {/* Big radio illustration placeholder */}
          <div
            style={{
              width: 220, height: 220, borderRadius: "50%",
              background: "rgba(0,200,160,0.12)",
              border: "2px solid rgba(0,200,160,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "5rem", margin: "0 auto",
            }}
          >
            📻
          </div>

          <div>
            <h2 style={{ color: "#fff", fontSize: "1.5rem", margin: "0 0 0.5rem" }}>
              Manage stations, podcasts, and analytics
            </h2>
            <p style={{ color: "rgba(255,255,255,0.55)", margin: 0, fontSize: "0.9rem", maxWidth: "34ch", marginInline: "auto" }}>
              All your broadcasting tools in one powerful dashboard.
            </p>
          </div>
        </div>

        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: "10%", right: "5%", width: 200, height: 200, borderRadius: "50%", background: "rgba(0,200,160,0.07)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "8%", width: 150, height: 150, borderRadius: "50%", background: "rgba(59,130,246,0.08)", pointerEvents: "none" }} />
      </div>

      {/* Right — form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.4rem" }}>Welcome Back</h1>
          <p style={{ color: "var(--text-muted)", margin: "0 0 2rem", fontSize: "0.9rem" }}>
            Sign in to manage your stations and broadcasts.
          </p>

          <form action={signInAction} style={{ display: "grid", gap: "1rem" }}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                id="email" name="email" type="email"
                placeholder="you@example.com"
                required autoComplete="email"
              />
            </div>

            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label htmlFor="password">Password</label>
                <Link href="/forgot-password" style={{ fontSize: "0.8rem", color: "var(--brand)" }}>Forgot Password?</Link>
              </div>
              <input
                id="password" name="password" type="password"
                required autoComplete="current-password"
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-muted)", cursor: "pointer" }}>
              <input type="checkbox" name="remember" style={{ width: "auto" }} />
              Remember me
            </label>

            {error && (
              <div className="alert alert-error">
                {decodeURIComponent(error)}
              </div>
            )}

            <button className="btn btn-primary btn-full" type="submit" style={{ marginTop: "0.25rem" }}>
              Sign In
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Don&apos;t have an account?{" "}
            <Link href="/sign-up" style={{ color: "var(--brand)", fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
