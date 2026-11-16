// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMediaQuery } from "@/lib/use-media-query";

type Listener = () => void;

/** A matchMedia stub whose result can be changed, notifying listeners. */
function stubMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  }));
  return (next: boolean) => {
    matches = next;
    listeners.forEach((fn) => {
      fn();
    });
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaQuery", () => {
  it("returns whether the query matches now", () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 640px)"));
    expect(result.current).toBe(true);
  });

  it("updates when the match changes", () => {
    const set = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 640px)"));
    act(() => {
      set(false);
    });
    expect(result.current).toBe(false);
  });
});
