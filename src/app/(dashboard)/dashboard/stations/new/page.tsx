import Link from "next/link";

import { createStationAction } from "../../actions";

type NewStationPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata = {
  title: "Create station"
};

export default async function NewStationPage({ searchParams }: NewStationPageProps) {
  const { error } = await searchParams;

  return (
    <main className="container" style={{ width: "100%", margin: 0, padding: "0.5rem 0 2rem", maxWidth: "820px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <span className="badge">Setup</span>
          <h1 style={{ margin: "0.6rem 0 0.2rem" }}>Create station</h1>
          <p className="muted" style={{ margin: 0 }}>
            We’ll generate a unique slug and source password automatically.
          </p>
        </div>
        <Link href="/dashboard" className="btn secondary">
          Back
        </Link>
      </div>

      <form className="card grid" style={{ marginTop: "1rem", padding: "1rem" }} action={createStationAction}>
        <div className="field">
          <label htmlFor="name">Station name</label>
          <input id="name" name="name" className="input" placeholder="Metro Pulse FM" minLength={3} maxLength={80} required />
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="field">
            <label htmlFor="genre">Genre</label>
            <input id="genre" name="genre" className="input" placeholder="Electronic / Talk" maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor="country">Country</label>
            <input id="country" name="country" className="input" placeholder="US" maxLength={80} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div className="field">
            <label htmlFor="language">Language</label>
            <input id="language" name="language" className="input" defaultValue="English" maxLength={60} required />
          </div>
          <div className="field">
            <label htmlFor="timezone">Timezone</label>
            <input id="timezone" name="timezone" className="input" defaultValue="UTC" maxLength={80} required />
          </div>
        </div>

        <div className="field">
          <label htmlFor="mountPath">Mount path</label>
          <input id="mountPath" name="mountPath" className="input" placeholder="/metro-pulse.mp3" maxLength={80} />
          <span className="hint">Generated automatically from station name if empty.</span>
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={4} placeholder="What does your station sound like?" maxLength={300} />
        </div>

        {error ? <p className="error">{error}</p> : null}

        <button className="btn primary" type="submit">
          Create station
        </button>
      </form>
    </main>
  );
}
