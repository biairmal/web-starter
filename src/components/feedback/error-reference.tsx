"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

/**
 * A reference for support (request ID or error digest) in mono, with a copy
 * button (DESIGN_BRIEF 6.5, 7.11). Labels come from the caller, so it also
 * works where next-intl is not available (global-error).
 */
export function ErrorReference({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <p className="flex items-center gap-2 font-mono text-small text-faint">
      <span>{label}</span>
      <button
        type="button"
        aria-label={copyLabel}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(
            () => {
              setCopied(true);
            },
            () => {
              setCopied(false);
            },
          );
        }}
        className="inline-flex size-6 items-center justify-center rounded-sm hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Copy aria-hidden="true" className="size-3.5" />
      </button>
      <span aria-live="polite" className="font-sans">
        {copied ? copiedLabel : ""}
      </span>
    </p>
  );
}
