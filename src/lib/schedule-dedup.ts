/**
 * Shared in-memory schedule window dedup.
 *
 * Prevents TRACK / PODCAST_EPISODE / RECORDING schedule blocks from
 * repeating within the same window activation.  Both the sched-track and
 * next-track route handlers import from this module so they share the same
 * singleton Map in the same Node.js process.
 */

export type BlockRef = {
  id: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
};

// Key: stationId:blockId:dayOfWeek:startHour:startMin → UTC ms when last served
const _schedServedAt = new Map<string, number>();

// Cleanup: drop entries older than 25 h once per hour
const _cleanup = setInterval(() => {
  const cutoff = Date.now() - 25 * 60 * 60 * 1000;
  for (const [k, v] of _schedServedAt) {
    if (v < cutoff) _schedServedAt.delete(k);
  }
}, 60 * 60 * 1000);
if (typeof _cleanup.unref === "function") _cleanup.unref();

export function windowKey(stationId: string, b: BlockRef): string {
  return `${stationId}:${b.id}:${b.dayOfWeek}:${b.startHour}:${b.startMin}`;
}

/**
 * Returns true if this block was already served after windowStartMs.
 * windowStartMs = approximate UTC timestamp when the current window opened.
 */
export function isAlreadyServedInWindow(
  stationId: string,
  block: BlockRef,
  windowStartMs: number,
): boolean {
  return (_schedServedAt.get(windowKey(stationId, block)) ?? 0) >= windowStartMs;
}

export function markServedInWindow(stationId: string, block: BlockRef): void {
  _schedServedAt.set(windowKey(stationId, block), Date.now());
}
