"use client";

import { useEffect, useRef, useState } from "react";

// Email links carry their one-time token in the URL fragment (TRD 6.3), which
// browsers never send to a server. The page reads it once and removes it from
// the address bar and history, so it is not bookmarked, shared or reused.

/** The `token` in a fragment such as `#token=abc`, or `null`. */
export function tokenFromHash(hash: string): string | null {
  const value = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return value && value.length > 0 ? value : null;
}

export type FragmentToken =
  | { state: "reading" }
  | { state: "found"; token: string }
  | { state: "missing" };

/**
 * Reads `#token=` after mount, then replaces the URL without its fragment.
 * Returns the token once; a second render or a remount in development keeps
 * the first answer.
 */
export function useFragmentToken(): FragmentToken {
  const [result, setResult] = useState<FragmentToken>({ state: "reading" });
  const read = useRef(false);

  useEffect(() => {
    if (read.current) {
      return;
    }
    read.current = true;
    const token = tokenFromHash(window.location.hash);
    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
    setResult(token ? { state: "found", token } : { state: "missing" });
  }, []);

  return result;
}
