import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "../auth-actions";
import { getCurrentSession } from "@/lib/auth";

export const metadata = {
  title: "Sign In - OpenRadio",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <div className="auth-page">
      <div className="auth-image-panel">
        <div className="auth-image-content">
          <Link href="/" className="auth-logo">
            <div className="auth-logo-icon">O</div>
            <span>openradio</span>
          </Link>

          <div className="auth-illustration">📻</div>

          <h2 className="auth-illustration-title">
            Welcome Back to OpenRadio
          </h2>
          <p className="auth-illustration-text">
            Continue broadcasting to your global audience. Sign in to access
            your dashboard, analytics, and streaming tools.
          </p>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1>Sign in to your account</h1>
            <p>
              New to OpenRadio?{" "}
              <Link href="/sign-up">Create an account</Link>
            </p>
          </div>

          {error && (
            <div className="auth-error">
              {error === "invalid" && "Invalid email or password"}
              {error === "server" && "Server error. Please try again."}
              {error === "credentials" && "Invalid credentials"}
            </div>
          )}

          <form action={signInAction} className="auth-form">
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Sign in
            </button>
          </form>

          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <Link
              href="/forgot-password"
              style={{ fontSize: "14px", color: "var(--text-muted)" }}
            >
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
