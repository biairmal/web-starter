"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Whole seconds left until a moment set with `start(seconds)`, ticking once a
 * second, and 0 when nothing is running. Used to keep a submit button off
 * while identity asks the user to wait (ACCOUNT_LOCKED, RATE_LIMITED).
 */
export function useCountdown(): {
  remaining: number;
  start: (seconds: number) => void;
} {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (until === null) {
      return;
    }
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= until) {
        setUntil(null);
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [until]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setUntil(current + Math.max(0, seconds) * 1000);
  }, []);

  const remaining =
    until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  return { remaining, start };
}
