import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordAction } from "./actions";
import { db } from "@/lib/db";
import crypto from "crypto";

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export const metadata = { title: "Reset Password – OpenRadio" };

function sha256(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token, error } = await searchParams;

  if (!token) redirect("/forgot-password?error=Invalid+or+missing+reset+token");

  const tokenHash = sha256(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  const isValid = record && !record.usedAt && record.expiresAt > new Date();

  return (
    <div className="auth-page">
      <div className="auth-image-panel">
        <div style={{ display: "grid", gap: "1.5rem", textAlign: "center", position: "relative", zIndex: 1 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.6rem", justifyContent: "center", textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "1.1rem" }}>O</div>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>openradio</span>
          </Link>
          <div style={{ width: 160, height: 160, borderRadius: "50%", background: "rgba(0,200,160,0.12)", border: "2px solid rgba(0,200,160,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem", margin: "0 auto" }}>
            {isValid ? "🔓" : "⛔"}
          </div>
          <div>
            <h2 style={{ color: "#fff", fontSize: "1.4rem", margin: "0 0 0.4rem" }}>
              {isValid ? "Choose a new password" : "Link expired"}
            </h2>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-inner">
          {!isValid ? (
            <>
              <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.75rem" }}>Link expired or invalid</h1>
              <p style={{ color: "var(--text-muted)", margin: "0 0 1.5rem", fontSize: "0.9rem" }}>
                This reset link has expired or already been used. Request a new one.
              </p>
              <Link href="/forgot-password" className="btn btn-primary btn-full">
                Request New Link
              </Link>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.4rem" }}>Set New Password</h1>
              <p style={{ color: "var(--text-muted)", margin: "0 0 2rem", fontSize: "0.9rem" }}>
                Choose a strong password. This link expires in 1 hour.
              </p>

              <form action={resetPasswordAction} style={{ display: "grid", gap: "1rem" }}>
                <input type="hidden" name="token" value={token} />

                <div className="field">
                  <label htmlFor="password">New password</label>
                  <input
                    id="password" name="password" type="password"
                    required minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                  <span className="hint">Min. 8 characters, one uppercase, one number.</span>
                </div>

                <div className="field">
                  <label htmlFor="confirm">Confirm password</label>
                  <input
                    id="confirm" name="confirm" type="password"
                    required minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {error && <div className="alert alert-error">{decodeURIComponent(error)}</div>}

                <button className="btn btn-primary btn-full" type="submit">
                  Reset Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
