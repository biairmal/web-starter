"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Keeps the open tab in a query parameter, so a reload or a shared link opens
 * the same tab: `const [tab, setTab] = useUrlTab("tab", ["details", "audit"])`
 * and pass both to `<Tabs value onValueChange>`. A value not in `values` (a
 * stale or hand-edited link) falls back to the first one. The URL is replaced,
 * not pushed, so switching tabs does not fill the Back history. Components
 * that use it must sit under a Suspense boundary (Next.js useSearchParams).
 */
export function useUrlTab<T extends string>(
  name: string,
  values: readonly [T, ...T[]],
): [T, (value: string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fallback = values[0];
  const raw = searchParams.get(name);
  const current = values.find((value) => value === raw) ?? fallback;

  const setTab = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value === fallback) {
        next.delete(name);
      } else {
        next.set(name, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [fallback, name, pathname, router, searchParams],
  );

  return [current, setTab];
}
