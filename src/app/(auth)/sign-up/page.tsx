import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "../auth-actions";
import { getCurrentSession } from "@/lib/auth";

export const metadata = {
  title: "Sign Up - OpenRadio",
};

export default async function SignUpPage({
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

          <div className="auth-illustration">🎙️</div>

          <h2 className="auth-illustration-title">
            Start Broadcasting Today
          </h2>
          <p className="auth-illustration-text">
            Join thousands of creators streaming to millions of listeners
            worldwide. Get started in minutes with our powerful broadcasting
            platform.
          </p>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h1>Create your account</h1>
            <p>
              Already have an account?{" "}
              <Link href="/sign-in">Sign in</Link>
            </p>
          </div>

          {error && (
            <div className="auth-error">
              {error === "email-exists" && "An account with this email already exists"}
              {error === "weak-password" && "Password must be at least 8 characters"}
              {error === "server" && "Server error. Please try again."}
              {error === "invalid" && "Invalid registration data"}
            </div>
          )}

          <form action={signUpAction} className="auth-form">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="John Doe"
                required
                autoComplete="name"
              />
            </div>

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
                autoComplete="new-password"
                minLength={8}
              />
              <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "6px" }}>
                Must be at least 8 characters
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Create account
            </button>
          </form>

          <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "24px", textAlign: "center" }}>
            By creating an account, you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--brand)" }}>
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: "var(--brand)" }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
