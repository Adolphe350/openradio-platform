/**
 * Generates a per-station Liquidsoap script.
 *
 * Architecture: hard-cut scheduling via time-based switch(track_sensitive=false).
 *
 *  - AutoDJ uses the static all_tracks.m3u playlist (fast, no API call).
 *  - Each active schedule block gets its own request.dynamic.list source that
 *    calls /api/internal/sched-track/[stationId]/[blockId].
 *    The sched-track API returns the file path if the block should play (once
 *    per window for TRACK/PODCAST/RECORDING, cycling for PLAYLIST), or an
 *    empty 200 when the block's content is exhausted — making the source
 *    unavailable so the switch falls through to AutoDJ.
 *  - switch(track_sensitive=false) fires at the exact second the time window
 *    opens: no waiting for the current AutoDJ track to finish.
 *  - Live encoder input always overrides everything.
 */

export type ScheduleSourceType =
  | "PLAYLIST"
  | "PODCAST_EPISODE"
  | "RECORDING"
  | "TRACK"
  | "RANDOM_ALL"
  | "LIVE_SLOT";

export type ScheduleEntry = {
  blockId: string;         // DB id of the ScheduleBlock row
  name: string;
  dayOfWeek: number;       // -1 = every day, 0 = Sun … 6 = Sat
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  sourceType: ScheduleSourceType;
  sourceId: string | null;
  playlistId: string | null;
};

export type LiqConfig = {
  stationId: string;
  stationName: string;
  mountPath: string;
  sourcePassword: string;
  icecastOutputPassword: string;
  icecastHost: string;
  icecastPort: number;
  genre: string;
  description: string;
  appBaseUrl: string;
  pollSecret: string;
  schedules: ScheduleEntry[];
  timezone: string;
  bitrate?: number;
};

function liqEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Convert a station-local time (day + hour:min) to UTC equivalents.
 * A single local window can span two UTC days (e.g. 23:00 local → 03:00 UTC next day).
 * Returns one or two UTC ranges to cover that case.
 */
function localWindowToUtc(
  dayOfWeek: number,
  startHour: number,
  startMin: number,
  endHour: number,
  endMin: number,
  timezone: string,
): { dayOfWeek: number; startMin: number; endMin: number }[] {
  const offsetMin = getTimezoneOffsetMinutes(timezone);
  let utcStart = startHour * 60 + startMin - offsetMin;
  let utcEnd = endHour * 60 + endMin - offsetMin;

  const results: { dayOfWeek: number; startMin: number; endMin: number }[] = [];

  if (utcStart < 0) {
    // Window start rolls back to previous day
    const prevDay = dayOfWeek === -1 ? -1 : (dayOfWeek + 6) % 7;
    if (utcEnd <= 0) {
      // Entire window is on the previous day
      results.push({ dayOfWeek: prevDay, startMin: utcStart + 1440, endMin: utcEnd + 1440 });
    } else {
      // Split: previous day tail + current day head
      results.push({ dayOfWeek: prevDay, startMin: utcStart + 1440, endMin: 1440 });
      const curDay = dayOfWeek;
      results.push({ dayOfWeek: curDay, startMin: 0, endMin: utcEnd });
    }
  } else if (utcEnd > 1440) {
    // Window end rolls into next day
    const nextDay = dayOfWeek === -1 ? -1 : (dayOfWeek + 1) % 7;
    if (utcStart >= 1440) {
      // Entire window is on the next day
      results.push({ dayOfWeek: nextDay, startMin: utcStart - 1440, endMin: utcEnd - 1440 });
    } else {
      // Split: current day tail + next day head
      results.push({ dayOfWeek: dayOfWeek, startMin: utcStart, endMin: 1440 });
      results.push({ dayOfWeek: nextDay, startMin: 0, endMin: utcEnd - 1440 });
    }
  } else {
    results.push({ dayOfWeek, startMin: utcStart, endMin: utcEnd });
  }

  return results;
}

/**
 * Get the UTC offset in minutes for a timezone (positive = ahead of UTC).
 * Uses the current offset. API-backed scheduled sources also validate the
 * station-local window on every request, so DST changes are corrected there.
 */
function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  }).formatToParts(now);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  // Parse "GMT-5", "GMT+5:30", "GMT+0", "GMT"
  const m = tzName.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const hours = parseInt(m[2], 10);
  const mins = parseInt(m[3] || "0", 10);
  return sign * (hours * 60 + mins);
}

/**
 * Build the Liquidsoap time condition for a schedule entry.
 *
 * All time conditions use time.utc() since the Liquidsoap container runs in UTC.
 * Station-local times are converted to UTC at config generation time.
 *
 * For API-backed blocks the sched-track API also validates timing with full
 * timezone/DST awareness, so even slight drift from DST changes is safe.
 */
function buildTimeConditionBody(e: ScheduleEntry, timezone: string): string {
  const utcRanges = localWindowToUtc(
    e.dayOfWeek,
    e.startHour,
    e.startMin,
    e.endHour,
    e.endMin,
    timezone,
  );

  if (utcRanges.length === 1) {
    const r = utcRanges[0];
    const lines: string[] = [];
    lines.push(`  t = time.utc()`);
    lines.push(`  now_min = t.hour * 60 + t.min`);
    if (r.dayOfWeek === -1) {
      lines.push(`  now_min >= ${r.startMin} and now_min < ${r.endMin}`);
    } else {
      lines.push(`  t.week_day == ${r.dayOfWeek} and now_min >= ${r.startMin} and now_min < ${r.endMin}`);
    }
    return lines.join("\n");
  }

  // Two ranges (day boundary split)
  const lines: string[] = [];
  lines.push(`  t = time.utc()`);
  lines.push(`  now_min = t.hour * 60 + t.min`);
  const conds = utcRanges.map((r) => {
    if (r.dayOfWeek === -1) {
      return `(now_min >= ${r.startMin} and now_min < ${r.endMin})`;
    }
    return `(t.week_day == ${r.dayOfWeek} and now_min >= ${r.startMin} and now_min < ${r.endMin})`;
  });
  lines.push(`  ${conds.join(" or ")}`);
  return lines.join("\n");
}

export function generateLiqScript(cfg: LiqConfig): string {
  const mount = cfg.mountPath.startsWith("/") ? cfg.mountPath : `/${cfg.mountPath}`;
  const bitrate = cfg.bitrate ?? 128;
  const configDir = `/configs/${cfg.stationId}`;
  const escapedSecret = liqEscape(cfg.pollSecret);
  const escapedBaseUrl = liqEscape(cfg.appBaseUrl);

  const lines: string[] = [];

  lines.push(`# Auto-generated by OpenRadio — station: ${cfg.stationName}`);
  lines.push(`# Hard-cut scheduling: switch(track_sensitive=false) fires at exact window time.`);
  lines.push(`# DO NOT EDIT — regenerated on every station/schedule save.`);
  lines.push(`set("log.stdout", true)`);
  lines.push(`set("server.telnet", false)`);
  lines.push(``);

  // ── on_track handler ──────────────────────────────────────────────────────
  lines.push(`# Report each track to the internal play-log API`);
  lines.push(`def on_track_handler(m) =`);
  lines.push(`  title  = m["title"]`);
  lines.push(`  artist = m["artist"]`);
  lines.push(`  if title != "" then`);
  lines.push(`    body = '{"title":"' ^ string.escape(title) ^ '","artist":"' ^ string.escape(artist) ^ '"}'`);
  lines.push(`    url  = "${escapedBaseUrl}/api/internal/play-log/${cfg.stationId}"`);
  lines.push(`    ignore(http.post(url,`);
  lines.push(`      headers=[("Content-Type","application/json"),("x-poll-secret","${escapedSecret}")],`);
  lines.push(`      data=body))`);
  lines.push(`  end`);
  lines.push(`end`);
  lines.push(``);

  // ── Live input ────────────────────────────────────────────────────────────
  lines.push(`# Live source — external encoder connects here`);
  lines.push(`live_input = input.harbor(`);
  lines.push(`  "/live/${cfg.stationId}",`);
  lines.push(`  port=9000,`);
  lines.push(`  user="source",`);
  lines.push(`  password="${liqEscape(cfg.sourcePassword)}")`);
  lines.push(``);

  // ── AutoDJ — static playlist ──────────────────────────────────────────────
  lines.push(`# AutoDJ — static playlist (fast, no API overhead)`);
  lines.push(`autodj = playlist(`);
  lines.push(`  id="autodj_${cfg.stationId}",`);
  lines.push(`  mode="random",`);
  lines.push(`  reload_mode="watch",`);
  lines.push(`  reload=30,`);
  lines.push(`  "${configDir}/all_tracks.m3u")`);
  lines.push(``);

  // ── Per-schedule-block dynamic sources ────────────────────────────────────
  // Only emit sources for blocks that need their own API call
  // (RANDOM_ALL → autodj directly in the switch; LIVE_SLOT → live_input)
  const scheduledBlocks = cfg.schedules.filter(
    (e) => e.sourceType !== "RANDOM_ALL" && e.sourceType !== "LIVE_SLOT",
  );

  if (scheduledBlocks.length > 0) {
    lines.push(`# Per-schedule-block dynamic sources`);
    lines.push(`# Each block calls its own sched-track API endpoint.`);
    lines.push(`# Returning an empty body makes the source unavailable → switch falls to AutoDJ.`);
    lines.push(``);
  }

  for (let i = 0; i < cfg.schedules.length; i++) {
    const entry = cfg.schedules[i];
    if (entry.sourceType === "RANDOM_ALL" || entry.sourceType === "LIVE_SLOT") continue;

    const safeId = `sched_${i}_${cfg.stationId.replace(/-/g, "_")}`;
    const apiUrl = `${cfg.appBaseUrl}/api/internal/sched-track/${cfg.stationId}/${entry.blockId}?secret=${cfg.pollSecret}`;

    lines.push(`# Block ${i}: "${entry.name}" [${entry.sourceType}]`);
    lines.push(`def get_sched_${i}() =`);
    lines.push(`  cmd = "curl --silent --show-error --fail --max-time 5 --retry 2 --retry-delay 1 '${liqEscape(apiUrl)}'"`);
    lines.push(`  result = process.read.lines(cmd)`);
    lines.push(`  uri = string.trim(list.hd(default="", result))`);
    lines.push(`  if uri == "" then`);
    lines.push(`    log("[sched] Block ${i} (${entry.name}) has no content — using AutoDJ")`);
    lines.push(`    []`);
    lines.push(`  else`);
    lines.push(`    log("[sched] Block ${i} (${entry.name}): #{uri}")`);
    lines.push(`    [request.create(uri)]`);
    lines.push(`  end`);
    lines.push(`end`);
    lines.push(`${safeId} = request.dynamic.list(id="${safeId}", get_sched_${i})`);
    lines.push(``);
  }

  // ── Hard-cut time-based switch ────────────────────────────────────────────
  if (cfg.schedules.length > 0) {
    lines.push(`# Time-condition functions for each schedule block`);
    lines.push(`# All times are UTC (converted from station timezone at config generation).`);
    for (let i = 0; i < cfg.schedules.length; i++) {
      const entry = cfg.schedules[i];
      lines.push(`def sched_time_${i}() =`);
      lines.push(buildTimeConditionBody(entry, cfg.timezone));
      lines.push(`end`);
      lines.push(``);
    }

    lines.push(`# Hard-cut scheduler: switch(track_sensitive=false) fires at exact window time.`);
    lines.push(`# AutoDJ is cut immediately when a scheduled window opens.`);
    lines.push(`# When the scheduled source is exhausted (empty from API), the switch falls`);
    lines.push(`# through to AutoDJ for the rest of the window.`);
    lines.push(`radio = switch(`);
    lines.push(`  track_sensitive=false,`);
    lines.push(`  [`);
    for (let i = 0; i < cfg.schedules.length; i++) {
      const entry = cfg.schedules[i];
      let src: string;
      if (entry.sourceType === "RANDOM_ALL") {
        src = "autodj";
      } else if (entry.sourceType === "LIVE_SLOT") {
        src = "live_input";
      } else {
        src = `sched_${i}_${cfg.stationId.replace(/-/g, "_")}`;
      }
      lines.push(`    (sched_time_${i}, ${src}),  # ${entry.name}`);
    }
    lines.push(`    ({true}, autodj)`);
    lines.push(`  ]`);
    lines.push(`)`);
  } else {
    lines.push(`radio = autodj`);
  }

  lines.push(``);

  // ── Transitions ───────────────────────────────────────────────────────────
  lines.push(`# Skip silent gaps, short crossfade`);
  lines.push(`radio = blank.skip(max_blank=0.35, threshold=-48.0, track_sensitive=false, radio)`);
  lines.push(`radio = crossfade(duration=0.12, fade_in=0.04, fade_out=0.04, radio)`);
  lines.push(``);
  lines.push(`# Attach play-log handler`);
  lines.push(`radio = source.on_track(radio, on_track_handler)`);
  lines.push(``);

  // ── Live override ─────────────────────────────────────────────────────────
  lines.push(`# Live encoder takes absolute priority`);
  lines.push(`radio = fallback(track_sensitive=false, [live_input, radio, blank()])`);
  lines.push(``);

  // ── Buffer ────────────────────────────────────────────────────────────────
  lines.push(`radio = mksafe(buffer(buffer=8.0, max=30.0, fallible=false, radio))`);
  lines.push(``);

  // ── Icecast output ────────────────────────────────────────────────────────
  lines.push(`output.icecast(`);
  lines.push(`  %mp3(bitrate=${bitrate}, samplerate=44100, stereo=true),`);
  lines.push(`  host="${liqEscape(cfg.icecastHost)}",`);
  lines.push(`  port=${cfg.icecastPort},`);
  lines.push(`  password="${liqEscape(cfg.icecastOutputPassword)}",`);
  lines.push(`  mount="${liqEscape(mount)}",`);
  lines.push(`  name="${liqEscape(cfg.stationName)}",`);
  lines.push(`  description="${liqEscape(cfg.description)}",`);
  lines.push(`  genre="${liqEscape(cfg.genre)}",`);
  lines.push(`  url="${liqEscape(cfg.appBaseUrl)}",`);
  lines.push(`  radio`);
  lines.push(`)`);

  return lines.join("\n") + "\n";
}
