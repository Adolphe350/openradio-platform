import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";

import { signInAction } from "../auth-actions";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata = {
  title: "Sign in"
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <form className="auth-card card" action={signInAction}>
        <span className="badge">OpenRadio Cloud</span>
        <h1 style={{ margin: "0.7rem 0 0.3rem" }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Use your account credentials to manage stations.
        </p>

        <div className="grid" style={{ marginTop: "1rem" }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" placeholder="you@station.fm" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" type="submit">
            Sign in
          </button>
        </div>

        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
          New here? <Link href="/sign-up">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
