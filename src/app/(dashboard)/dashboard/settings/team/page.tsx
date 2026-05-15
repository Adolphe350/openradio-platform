import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inviteTeamMemberAction, removeTeamMemberAction } from "./actions";

export const metadata = { title: "Team – OpenRadio" };

type Props = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function TeamPage({ searchParams }: Props) {
  const user = await requireUser();
  const { error, success } = await searchParams;

  const members = await db.teamMember.findMany({
    where: { accountId: user.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="dash-page" style={{ maxWidth: 720 }}>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Team Management</h1>
          <p className="dash-page-sub">Invite team members to access your account.</p>
        </div>
        <Link href="/dashboard/settings" className="btn btn-secondary btn-sm">← Settings</Link>
      </div>

      {error && <div className="alert alert-error">{decodeURIComponent(error)}</div>}
      {success && <div className="alert alert-success">{decodeURIComponent(success)}</div>}

      <div className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Invite a team member</h2>
        <form action={inviteTeamMemberAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
          <div className="field">
            <label htmlFor="email">Email address *</label>
            <input id="email" name="email" type="email" required placeholder="colleague@example.com" />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <select id="role" name="role">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit">Invite</button>
        </form>
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          The user must already have an OpenRadio account with that email address.
        </p>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Team Members ({members.length + 1})</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ fontWeight: 600 }}>{user.name} <span style={{ fontSize: "0.72rem", background: "var(--brand-light)", color: "var(--brand-dark)", padding: "0.1rem 0.5rem", borderRadius: 999 }}>You</span></td>
              <td style={{ color: "var(--text-muted)" }}>{user.email}</td>
              <td><span className="badge badge-green" style={{ fontSize: "0.7rem" }}>OWNER</span></td>
              <td />
            </tr>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.user.name}</td>
                <td style={{ color: "var(--text-muted)" }}>{m.user.email}</td>
                <td>
                  <span className={`badge ${m.role === "ADMIN" ? "badge-blue" : ""}`} style={{ fontSize: "0.7rem" }}>
                    {m.role}
                  </span>
                </td>
                <td>
                  <form action={removeTeamMemberAction} style={{ display: "inline" }}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <button className="btn btn-danger btn-sm" type="submit">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
