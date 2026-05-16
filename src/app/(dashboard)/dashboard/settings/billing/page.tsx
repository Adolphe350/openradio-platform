import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Billing – OpenRadio" };

const PLAN_LIMITS: Record<string, { maxStations: number | null; maxListeners: number | null; maxBitrate: number }> = {
  free:    { maxStations: 2,    maxListeners: 500,    maxBitrate: 128 },
  starter: { maxStations: 5,    maxListeners: 5000,   maxBitrate: 128 },
  pro:     { maxStations: 15,   maxListeners: 25000,  maxBitrate: 192 },
  premier: { maxStations: null, maxListeners: null,   maxBitrate: 320 },
};

function fmtLimit(val: number | null, unit = "") {
  if (val === null) return "Unlimited";
  return val.toLocaleString() + (unit ? " " + unit : "");
}

export default async function BillingPage() {
  const user = await requireUser();

  // Get active subscription
  const subscription = await db.userSubscription.findFirst({
    where: { userId: user.id, status: "active" },
    include: { plan: true },
    orderBy: { startedAt: "desc" },
  });

  const stationCount = await db.station.count({ where: { ownerId: user.id } });

  const planSlug = subscription?.plan.slug ?? "free";
  const planName = subscription?.plan.name ?? "Free";
  const limits = PLAN_LIMITS[planSlug] ?? PLAN_LIMITS.free;

  const stationUsed = stationCount;
  const stationMax = limits.maxStations;
  const stationPct = stationMax ? Math.min(100, (stationUsed / stationMax) * 100) : 0;

  const plans = [
    {
      name: "Free",
      slug: "free",
      price: "Free",
      maxStations: 2,
      maxListeners: 500,
      maxBitrate: 128,
      features: ["2 stations", "500 concurrent listeners", "128 kbps quality", "AutoDJ + scheduling", "Basic analytics"],
    },
    {
      name: "Starter",
      slug: "starter",
      price: "$14/mo",
      maxStations: 5,
      maxListeners: 5000,
      maxBitrate: 128,
      features: ["5 stations", "5,000 concurrent listeners", "128 kbps quality", "400k listening hours/month", "Full analytics + history"],
    },
    {
      name: "Pro",
      slug: "pro",
      price: "$25/mo",
      maxStations: 15,
      maxListeners: 25000,
      maxBitrate: 192,
      features: ["15 stations", "25,000 concurrent listeners", "192 kbps quality", "1M listening hours/month", "Priority support"],
    },
    {
      name: "Premier",
      slug: "premier",
      price: "$115/mo",
      maxStations: null,
      maxListeners: null,
      maxBitrate: 320,
      features: ["Unlimited stations", "Unlimited listeners", "320 kbps quality", "2.5M listening hours/month", "Enterprise support"],
    },
  ];

  return (
    <div className="dash-page" style={{ maxWidth: 760 }}>
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Billing &amp; Plan</h1>
          <p className="dash-page-sub">Manage your subscription and usage.</p>
        </div>
        <Link href="/dashboard/settings" className="btn btn-secondary btn-sm">← Settings</Link>
      </div>

      {/* Current Plan */}
      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)" }}>Current Plan</p>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem" }}>{planName}</h2>
            {subscription ? (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                Active since {subscription.startedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                {subscription.expiresAt && ` · Renews ${subscription.expiresAt.toLocaleDateString()}`}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>Self-hosted open-source tier</p>
            )}
          </div>
          <Link href="/pricing" className="btn btn-primary btn-sm">Upgrade Plan</Link>
        </div>

        <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
          {[
            { label: "Stations", used: stationUsed, max: stationMax },
            { label: "Max Listeners", used: null, max: limits.maxListeners },
            { label: "Max Bitrate", used: null, max: limits.maxBitrate, unit: "kbps" },
          ].map((item) => (
            <div key={item.label} style={{ padding: "1rem", background: "var(--bg-page)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <p style={{ margin: "0 0 0.3rem", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>{item.label}</p>
              <p style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", fontWeight: 800 }}>
                {item.used !== null ? `${item.used} / ${fmtLimit(item.max)}` : fmtLimit(item.max, item.unit ?? "")}
              </p>
              {item.used !== null && item.max !== null && (
                <div style={{ height: 5, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${stationPct}%`, background: stationPct > 80 ? "#ef4444" : "var(--brand)", borderRadius: 999 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Plan comparison */}
      <div>
        <h2 style={{ fontSize: "1rem", margin: "0 0 1rem", fontWeight: 700 }}>Available Plans</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(165px,1fr))", gap: "0.75rem" }}>
          {plans.map((plan) => {
            const isCurrent = plan.slug === planSlug;
            return (
              <div
                key={plan.slug}
                className="card"
                style={{
                  padding: "1.25rem",
                  border: isCurrent ? "2px solid var(--brand)" : undefined,
                  position: "relative",
                }}
              >
                {isCurrent && (
                  <span style={{
                    position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                    background: "var(--brand)", color: "#fff", fontSize: "0.68rem", fontWeight: 700,
                    padding: "0.15rem 0.6rem", borderRadius: 999, whiteSpace: "nowrap",
                  }}>
                    Current plan
                  </span>
                )}
                <h3 style={{ margin: "0 0 0.15rem", fontSize: "1rem" }}>{plan.name}</h3>
                <p style={{ margin: "0 0 1rem", fontSize: "1.25rem", fontWeight: 800 }}>{plan.price}</p>
                <ul style={{ margin: "0 0 1.25rem", paddingLeft: "1.1rem", display: "grid", gap: "0.3rem" }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{f}</li>
                  ))}
                </ul>
                {isCurrent ? (
                  <span className="btn btn-secondary btn-sm btn-full" style={{ display: "block", textAlign: "center", cursor: "default", opacity: 0.6 }}>Active</span>
                ) : (
                  <Link href="/pricing" className="btn btn-primary btn-sm btn-full" style={{ display: "block", textAlign: "center" }}>
                    {plan.slug === "free" ? "Downgrade" : "Upgrade"}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-light)", textAlign: "center" }}>
        OpenRadio is open-source and self-hosted. Plan limits apply to the managed cloud version only.{" "}
        <Link href="/pricing" style={{ color: "var(--brand)" }}>View full pricing</Link>
      </p>
    </div>
  );
}
