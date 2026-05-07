export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return "--";
  }

  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

export function fallbackValue(value?: string | null) {
  return value?.trim() ? value : "—";
}
