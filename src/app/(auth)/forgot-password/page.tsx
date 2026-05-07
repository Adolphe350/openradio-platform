import Link from "next/link";
import { forgotPasswordAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export const metadata = { title: "Forgot Password – OpenRadio" };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, success } = await searchParams;

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-image-panel">
        <div style={{ display: "grid", gap: "1.5rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", justifyContent: "center", textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "1.1rem" }}>Z</div>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>openradio</span>
          </Link>
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: "rgba(0,200,160,0.12)", border: "2px solid rgba(0,200,160,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", margin: "0 auto" }}>🔑</div>
          <div>
            <h2 style={{ color: "#fff", fontSize: "1.4rem", margin: "0 0 0.4rem" }}>Reset your password</h2>
            <p style={{ color: "rgba(255,255,255,0.55)", margin: 0, fontSize: "0.9rem", maxWidth: "30ch", marginInline: "auto" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.4rem" }}>Forgot Password?</h1>
          <p style={{ color: "var(--text-muted)", margin: "0 0 2rem", fontSize: "0.9rem" }}>
            Enter your account email address. If an account exists, you&apos;ll receive a reset link.
          </p>

          {success ? (
            <div className="alert alert-success" style={{ marginBottom: "1.5rem" }}>
              {decodeURIComponent(success)}
            </div>
          ) : (
            <form action={forgotPasswordAction} style={{ display: "grid", gap: "1rem" }}>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
              </div>

              {error && <div className="alert alert-error">{decodeURIComponent(error)}</div>}

              <button className="btn btn-primary btn-full" type="submit">
                Send Reset Link
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Remembered it?{" "}
            <Link href="/sign-in" style={{ color: "var(--brand)", fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
