import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "../auth-actions";
import { getCurrentSession } from "@/lib/auth";
import { AuthFrame, authErrorText } from "@/components/auth-frame";

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
  const error = authErrorText(params.error);

  return (
    <AuthFrame
      title="Get started"
      lede="Create a free account, then set up your first station."
      sideTitle="Upload. Schedule. Broadcast."
      sideText="Your account comes with a station page, an Icecast mount for live shows, AutoDJ playlists and an embeddable player."
    >
      {error ? (
        <div className="auth-alert" role="alert">
          {error}
        </div>
      ) : null}

      <form action={signUpAction} className="auth-fields">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input type="text" id="name" name="name" placeholder="Jane Uwase" required autoComplete="name" />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" placeholder="you@station.com" required autoComplete="email" />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input type="password" id="password" name="password" required autoComplete="new-password" minLength={8} aria-describedby="pw-hint" />
          <span id="pw-hint" className="hint">At least 8 characters.</span>
        </div>

        <button type="submit" className="btn btn-primary btn-full btn-lg">
          Create account
        </button>
      </form>

      <ol className="auth-next mono" aria-label="What happens next">
        <li><span>01</span> Create your account</li>
        <li><span>02</span> Name your station</li>
        <li><span>03</span> Upload music or connect an encoder</li>
      </ol>

      <p className="auth-switch">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
      <p className="auth-legal">
        By creating an account you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </AuthFrame>
  );
}
