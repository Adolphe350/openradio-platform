"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";

/** Switches the studio between dark (default) and daylight themes. */
export function ThemeToggle({ className = "studio-icon-btn" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("or-theme", next);
    } catch {
      /* private mode: theme still applies for this page */
    }
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to daylight theme" : "Switch to studio (dark) theme";

  return (
    <button type="button" className={className} onClick={toggle} aria-label={label} title={label}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
