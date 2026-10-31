// Smoke check + viewport screenshots (never full page).
// Checks: every main page loads (<400), sign-in works, no console errors,
// no sideways scroll at 390px.
// Run inside the Playwright image (see scripts/smoke.sh):
//   BASE=http://127.0.0.1:3305 OUT=/out EMAIL=... PASSWORD=... PREFIX=after- node scripts/smoke.cjs
const { chromium } = require("playwright-core");

const BASE = (process.env.BASE || "http://127.0.0.1:3305").replace(/\/$/, "");
const OUT = process.env.OUT || ".";
const PREFIX = process.env.PREFIX || "";
const EMAIL = process.env.EMAIL || "";
const PASSWORD = process.env.PASSWORD || "";
const SHOTS = process.env.SHOTS !== "0";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;

const sizes = process.env.SIZES === "tablet"
  ? [{ tag: "tablet", width: 900, height: 1000 }]
  : [
      { tag: "desk", width: 1440, height: 900 },
      { tag: "phone", width: 390, height: 844 },
    ];

const publicPages = [
  ["landing", "/"],
  ["signin", "/sign-in"],
  ["signup", "/sign-up"],
  ["explore", "/explore"],
  ["pricing", "/pricing"],
  ["streaming", "/streaming"],
  ["forgot", "/forgot-password"],
];

const appPages = [
  ["dashboard", "/dashboard"],
  ["studio", "/dashboard/studio"],
  ["music", "/dashboard/music"],
  ["analytics", "/dashboard/analytics"],
  ["podcasts", "/dashboard/podcasts"],
  ["settings", "/dashboard/settings"],
  ["billing", "/dashboard/settings/billing"],
  ["newstation", "/dashboard/stations/new"],
];

const stationTabs = [
  ["st-overview", "?tab=overview"],
  ["st-autodj", "?tab=autodj"],
  ["st-tracks", "?tab=tracks"],
  ["st-widget", "?tab=widget"],
  ["st-ctl", "?tab=ctl"],
  ["st-settings", "?tab=settings"],
  ["st-scheduler", "/scheduler"],
];

let failures = 0;
function fail(msg) {
  failures++;
  console.log("FAIL " + msg);
}

const ignore = /favicon|manifest|Failed to load resource.*(stream|hls|\.mp3|\.m3u8|icecast|live)|net::ERR_|MEDIA_ERR|NotSupportedError|AbortError|play\(\) request|no supported source/i;

async function visit(page, name, url, tag, errors) {
  if (ONLY && !ONLY.includes(name)) return;
  let res;
  try {
    res = await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  } catch (e) {
    fail(`${name}@${tag}: navigation error ${String(e).slice(0, 120)}`);
    return;
  }
  const status = res ? res.status() : 0;
  if (status >= 400) fail(`${name}@${tag}: HTTP ${status}`);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (tag === "phone" && overflow > 1) fail(`${name}@${tag}: sideways scroll ${overflow}px`);
  if (SHOTS) await page.screenshot({ path: `${OUT}/${PREFIX}${name}-${tag}.png` });
  const real = errors.filter((e) => !ignore.test(e));
  if (real.length) fail(`${name}@${tag}: console errors: ${real.slice(0, 3).join(" | ").slice(0, 400)}`);
  errors.length = 0;
  console.log(`ok   ${name}@${tag} (${status})`);
}

(async () => {
  const browser = await chromium.launch();
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height } });
    const page = await ctx.newPage();
    if (process.env.THEME) {
      await ctx.addInitScript((t) => { try { localStorage.setItem("or-theme", t); } catch (e) {} }, process.env.THEME);
    }
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(String(e)));

    for (const [name, url] of publicPages) await visit(page, name, url, s.tag, errors);

    // Station public page + embed: first station found on /explore
    await page.goto(BASE + "/explore", { waitUntil: "domcontentloaded" });
    const slugHref = await page
      .locator('a[href^="/stations/"]')
      .first()
      .getAttribute("href")
      .catch(() => null);
    if (slugHref) {
      const slug = slugHref.split("/")[2];
      await visit(page, "station-public", `/stations/${slug}`, s.tag, errors);
      await visit(page, "embed", `/embed/${slug}`, s.tag, errors);
    }

    if (EMAIL && PASSWORD) {
      await page.goto(BASE + "/sign-in", { waitUntil: "domcontentloaded" });
      await page.fill('input[name="email"]', EMAIL);
      await page.fill('input[name="password"]', PASSWORD);
      await Promise.all([
        page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {}),
        page.locator('form button[type="submit"]').first().click(),
      ]);
      if (!/\/dashboard/.test(page.url())) {
        fail(`signin@${s.tag}: did not reach /dashboard (at ${page.url()})`);
      } else {
        console.log(`ok   signin-flow@${s.tag}`);
        errors.length = 0;
        for (const [name, url] of appPages) await visit(page, name, url, s.tag, errors);
        await page.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
        const stHref = await page
          .locator('a[href^="/dashboard/stations/c"], a[href*="/dashboard/stations/"][href*="tab=overview"]')
          .first()
          .getAttribute("href")
          .catch(() => null);
        const m = stHref && stHref.match(/\/dashboard\/stations\/([a-z0-9]+)/);
        if (m) {
          for (const [name, suffix] of stationTabs)
            await visit(page, name, `/dashboard/stations/${m[1]}${suffix}`, s.tag, errors);
        } else {
          console.log(`note no station owned by ${EMAIL}; station tabs skipped`);
        }
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL OK");
  process.exit(failures ? 1 : 0);
})();
