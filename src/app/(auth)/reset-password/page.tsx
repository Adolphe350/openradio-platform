import Link from "next/link";
import { redirect } from "next/navigation";
import { resetPasswordAction } from "./actions";
import { db } from "@/lib/db";
import crypto from "crypto";
import { AuthFrame } from "@/components/auth-frame";

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

  if (!isValid) {
    return (
      <AuthFrame
        title="Link expired or invalid"
        lede="This reset link has expired or was already used. Request a new one."
        sideTitle="Reset links last one hour."
        sideText="For your security each link works once."
      >
        <Link href="/forgot-password" className="btn btn-primary btn-full btn-lg">
          Request a new link
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Choose a new password"
      lede="Pick a strong password. This link expires in 1 hour."
      sideTitle="Almost back in the studio."
      sideText="After saving, sign in with your new password."
    >
      <form action={resetPasswordAction} className="auth-fields">
        <input type="hidden" name="token" value={token} />

        <div className="field">
          <label htmlFor="password">New password</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" aria-describedby="pw-hint" />
          <span id="pw-hint" className="hint">At least 8 characters, one uppercase letter, one number.</span>
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </div>

        {error ? <div className="auth-alert" role="alert">{decodeURIComponent(error)}</div> : null}

        <button className="btn btn-primary btn-full btn-lg" type="submit">
          Save new password
        </button>
      </form>
    </AuthFrame>
  );
}
