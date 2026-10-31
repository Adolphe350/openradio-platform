import Link from "next/link";
import { forgotPasswordAction } from "./actions";
import { AuthFrame } from "@/components/auth-frame";

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export const metadata = { title: "Forgot Password – OpenRadio" };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { error, success } = await searchParams;

  return (
    <AuthFrame
      title="Reset your password"
      lede="Enter your account email. If an account exists, we will send a reset link."
      sideTitle="Back on air in a minute."
      sideText="Reset links expire after one hour and can be used once."
    >
      {success ? (
        <div className="alert alert-success" role="status">{decodeURIComponent(success)}</div>
      ) : (
        <form action={forgotPasswordAction} className="auth-fields">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" placeholder="you@station.com" required autoComplete="email" />
          </div>

          {error ? <div className="auth-alert" role="alert">{decodeURIComponent(error)}</div> : null}

          <button className="btn btn-primary btn-full btn-lg" type="submit">
            Send reset link
          </button>
        </form>
      )}

      <p className="auth-switch">
        Remembered it? <Link href="/sign-in">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
