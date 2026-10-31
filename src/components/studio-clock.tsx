"use client";

import { useEffect, useState } from "react";

/** Studio wall clock in the visitor's local time (renders after mount to avoid hydration drift). */
export function StudioClock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);

  return (
    <time className="mono studio-clock" suppressHydrationWarning>
      {now ?? "--:--"}
    </time>
  );
}
