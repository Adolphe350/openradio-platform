import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProfileAction, changePasswordAction } from "./actions";

export const metadata = { title: "Settings – OpenRadio" };

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function SettingsPage({ searchParams }: Props) {
  const sessionUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  const { error, success } = await searchParams;

  return (
    <div className="dash-page" style={{ maxWidth: 680 }}>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Account Settings</h1>
          <p className="dash-page-sub">Manage your profile, email, and password.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">← Dashboard</Link>
      </div>

      {error && <div className="alert alert-error">{decodeURIComponent(error)}</div>}
      {success && <div className="alert alert-success">{decodeURIComponent(success)}</div>}

      {/* Profile */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Profile</h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Update your display name and email address.
        </p>
        <form action={updateProfileAction} style={{ display: "grid", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="name">Display name</label>
            <input id="name" name="name" type="text" defaultValue={user.name} required minLength={2} maxLength={60} />
          </div>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" defaultValue={user.email} required />
          </div>
          <div>
            <button className="btn btn-primary" type="submit">Save profile</button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Change Password</h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Choose a strong password with at least 8 characters.
        </p>
        <form action={changePasswordAction} style={{ display: "grid", gap: "1rem" }}>
          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
          </div>
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            <span className="hint">At least 8 characters, one uppercase, one number.</span>
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div>
            <button className="btn btn-primary" type="submit">Change password</button>
          </div>
        </form>
      </div>

      {/* Team management */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>Team</h2>
        <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Invite team members and manage their roles.
        </p>
        <Link href="/dashboard/settings/team" className="btn btn-secondary btn-sm">Manage Team</Link>
      </div>

      {/* Account info */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Account Info</h2>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {[
            { label: "User ID", value: user.id },
            { label: "Member since", value: user.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
          ].map((row) => (
            <div key={row.label} style={{ display: "flex", gap: "1rem", alignItems: "baseline" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 110 }}>{row.label}</span>
              <code style={{ fontSize: "0.82rem", color: "var(--text)" }}>{row.value}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
