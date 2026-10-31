import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "../auth-actions";
import { getCurrentSession } from "@/lib/auth";
import { AuthFrame, authErrorText } from "@/components/auth-frame";

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
  const error = authErrorText(params.error);

  return (
    <AuthFrame
      title="Sign in to your studio"
      lede="Manage your stations, library, schedule and stream."
      sideTitle="Your station is one sign-in away."
      sideText="Pick up where you left off: check who is listening, line up the next show, or open the encoder settings and go live."
    >
      {error ? (
        <div className="auth-alert" role="alert">
          {error}
        </div>
      ) : null}

      <form action={signInAction} className="auth-fields">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" placeholder="you@station.com" required autoComplete="email" />
        </div>

        <div className="field">
          <div className="field-row">
            <label htmlFor="password">Password</label>
            <Link href="/forgot-password" className="field-link">Forgot password?</Link>
          </div>
          <input type="password" id="password" name="password" required autoComplete="current-password" />
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg">
          Sign in
        </button>
      </form>

      <p className="auth-switch">
        New to OpenRadio Cloud? <Link href="/sign-up">Create your station</Link>
      </p>
    </AuthFrame>
  );
}
