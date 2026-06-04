import assert from "node:assert/strict";
import { generateLiqScript, type LiqConfig } from "../src/lib/liquidsoap";

type Block = {
  id: string;
  name: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
};

function localTime(at: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const dow = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[get("weekday")] ?? 0;
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  const minute = Number(get("minute"));
  return { dow, nowMin: hour * 60 + minute };
}

function isActive(block: Block, atIso: string, timezone: string) {
  const at = new Date(atIso);
  const { dow, nowMin } = localTime(at, timezone);
  const startMin = block.startHour * 60 + block.startMin;
  const endMin = block.endHour * 60 + block.endMin;
  return (block.dayOfWeek === -1 || block.dayOfWeek === dow) && nowMin >= startMin && nowMin < endMin;
}

function baseConfig(timezone: string): LiqConfig {
  return {
    stationId: "station_test",
    stationName: `Smoke ${timezone}`,
    mountPath: "/test.mp3",
    sourcePassword: "source",
    icecastOutputPassword: "icecast",
    icecastHost: "icecast",
    icecastPort: 8000,
    genre: "Test",
    description: "Scheduler timezone smoke test",
    appBaseUrl: "http://app:3000",
    pollSecret: "secret",
    timezone,
    schedules: [],
  };
}

function assertContains(haystack: string, needle: string) {
  assert.ok(haystack.includes(needle), `Expected generated Liquidsoap to contain: ${needle}`);
}

const kigaliRecording: Block = {
  id: "rec_kigali",
  name: "Kigali recorded program",
  dayOfWeek: 4,
  startHour: 20,
  startMin: 30,
  endHour: 21,
  endMin: 0,
};

assert.equal(isActive(kigaliRecording, "2026-06-04T18:29:00.000Z", "Africa/Kigali"), false);
assert.equal(isActive(kigaliRecording, "2026-06-04T18:30:00.000Z", "Africa/Kigali"), true);
assert.equal(isActive(kigaliRecording, "2026-06-04T18:59:00.000Z", "Africa/Kigali"), true);
assert.equal(isActive(kigaliRecording, "2026-06-04T19:00:00.000Z", "Africa/Kigali"), false);
assert.equal(isActive(kigaliRecording, "2026-06-04T18:30:00.000Z", "Europe/London"), false);

const londonRecording: Block = {
  id: "rec_london",
  name: "London recorded program",
  dayOfWeek: 4,
  startHour: 20,
  startMin: 30,
  endHour: 21,
  endMin: 0,
};

assert.equal(isActive(londonRecording, "2026-06-04T19:29:00.000Z", "Europe/London"), false);
assert.equal(isActive(londonRecording, "2026-06-04T19:30:00.000Z", "Europe/London"), true);
assert.equal(isActive(londonRecording, "2026-06-04T19:59:00.000Z", "Europe/London"), true);
assert.equal(isActive(londonRecording, "2026-06-04T20:00:00.000Z", "Europe/London"), false);

const kigaliScript = generateLiqScript({
  ...baseConfig("Africa/Kigali"),
  schedules: [{
    blockId: kigaliRecording.id,
    name: kigaliRecording.name,
    dayOfWeek: kigaliRecording.dayOfWeek,
    startHour: kigaliRecording.startHour,
    startMin: kigaliRecording.startMin,
    endHour: kigaliRecording.endHour,
    endMin: kigaliRecording.endMin,
    sourceType: "RECORDING",
    sourceId: "recording-file-id",
    playlistId: null,
  }],
});

assertContains(kigaliScript, "t.week_day == 4 and now_min >= 1110 and now_min < 1140");
assertContains(kigaliScript, "/api/internal/sched-track/station_test/rec_kigali?secret=secret");
assertContains(kigaliScript, "(sched_time_0, sched_0_station_test)");
assertContains(kigaliScript, "({true}, autodj)");

const londonScript = generateLiqScript({
  ...baseConfig("Europe/London"),
  schedules: [{
    blockId: londonRecording.id,
    name: londonRecording.name,
    dayOfWeek: londonRecording.dayOfWeek,
    startHour: londonRecording.startHour,
    startMin: londonRecording.startMin,
    endHour: londonRecording.endHour,
    endMin: londonRecording.endMin,
    sourceType: "RECORDING",
    sourceId: "recording-file-id",
    playlistId: null,
  }],
});

assertContains(londonScript, "t.week_day == 4 and now_min >= 1170 and now_min < 1200");

console.log("Scheduler timezone smoke tests passed:");
console.log("- Kigali 20:30 local activates at 18:30 UTC and uses recorded-program source.");
console.log("- London 20:30 local activates at 19:30 UTC during BST and uses recorded-program source.");
console.log("- Outside schedule windows, generated Liquidsoap falls back to AutoDJ.");
