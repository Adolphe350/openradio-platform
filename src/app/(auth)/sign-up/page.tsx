import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth";

import { signUpAction } from "../auth-actions";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata = {
  title: "Create account"
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const session = await getCurrentSession();
  if (session) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <form className="auth-card card" action={signUpAction}>
        <span className="badge">OpenRadio Cloud</span>
        <h1 style={{ margin: "0.7rem 0 0.3rem" }}>Create account</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Launch stations and manage streaming from your own infrastructure.
        </p>

        <div className="grid" style={{ marginTop: "1rem" }}>
          <div className="field">
            <label htmlFor="name">Display name</label>
            <input className="input" id="name" name="name" type="text" required minLength={2} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" placeholder="you@station.fm" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required minLength={8} />
            <span className="hint">Use at least 8 chars, one uppercase letter, and one number.</span>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" type="submit">
            Create account
          </button>
        </div>

        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Already have an account? <Link href="/sign-in">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
