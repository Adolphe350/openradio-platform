"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
      aria-live="polite"
    >
      <Icon name={copied ? "check" : "code"} size={16} />
      {copied ? "Copied" : label}
    </button>
  );
}
