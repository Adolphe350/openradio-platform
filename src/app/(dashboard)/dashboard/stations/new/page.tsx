import Link from "next/link";
import { createStationAction } from "../../actions";

type Props = { searchParams: Promise<{ error?: string }> };

export const metadata = { title: "Create Station – OpenRadio" };

const GENRES = ["Music","News","Talk","Sports","Religious","Hip-Hop","Pop","Rock","Electronic","Jazz","Classical","R&B","Country","Reggae","Latin","Comedy","Education","Kids"];
const LANGUAGES = ["English","Spanish","Portuguese","French","Arabic","Hindi","German","Italian","Russian","Japanese","Korean","Dutch","Polish","Turkish","Swedish"];
const TIMEZONES = ["UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles","America/Sao_Paulo","Europe/London","Europe/Paris","Europe/Berlin","Africa/Nairobi","Asia/Dubai","Asia/Kolkata","Asia/Tokyo","Australia/Sydney"];

export default async function NewStationPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="dash-page" style={{ maxWidth: 720 }}>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Create a Station</h1>
          <p className="dash-page-sub">Fill in the details. Encoder credentials are generated automatically.</p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary btn-sm">← Back</Link>
      </div>

      {error && <div className="alert alert-error">{decodeURIComponent(error)}</div>}

      <form action={createStationAction} style={{ display: "grid", gap: "1.5rem" }}>

        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Station info</h2>
          <div className="field">
            <label htmlFor="name">Station name *</label>
            <input id="name" name="name" placeholder="e.g. Metro Pulse FM" minLength={3} maxLength={80} required autoFocus />
            <span className="hint">This becomes your public page URL slug.</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <div className="field">
              <label htmlFor="genre">Genre</label>
              <select id="genre" name="genre">
                <option value="">Select genre…</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="language">Language *</label>
              <select id="language" name="language" defaultValue="English">
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="country">Country</label>
              <input id="country" name="country" placeholder="e.g. United States" maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="timezone">Timezone *</label>
              <select id="timezone" name="timezone" defaultValue="UTC">
                {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={3} placeholder="What does your station sound like?" maxLength={300} />
          </div>
        </div>

        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <h2 style={{ fontSize: "1rem", margin: 0 }}>Stream configuration</h2>
          <div className="field">
            <label htmlFor="mountPath">Mount path</label>
            <input id="mountPath" name="mountPath" placeholder="/my-station.mp3" maxLength={80} />
            <span className="hint">Leave blank to auto-generate from station name.</span>
          </div>
          <div className="alert alert-info" style={{ fontSize: "0.85rem" }}>
            After creating, you will receive an Icecast host, port, mount, username, and password to plug into your encoder.
          </div>
        </div>

        <button className="btn btn-primary btn-lg" type="submit">
          Create station →
        </button>
      </form>
    </div>
  );
}
