import { useSyncExternalStore } from "react";

// A stand-in for the Next.js router in component tests: one URL that push
// and replace change, re-rendering every component that reads the search
// params. Use it with
// `vi.mock("next/navigation", async () => (await import("../helpers/fake-router")).navigation)`.

const listeners = new Set<() => void>();

export const fakeRouter = {
  url: "/",
  calls: [] as { mode: "push" | "replace"; url: string }[],
  reset(url: string) {
    fakeRouter.calls = [];
    fakeRouter.set(url);
  },
  set(url: string) {
    fakeRouter.url = url;
    for (const listener of listeners) {
      listener();
    }
  },
  /** The current query string as a URLSearchParams. */
  get search() {
    return new URL(fakeRouter.url, "http://app.test").searchParams;
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const router = {
  push: (url: string) => {
    fakeRouter.calls.push({ mode: "push", url });
    fakeRouter.set(url);
  },
  replace: (url: string) => {
    fakeRouter.calls.push({ mode: "replace", url });
    fakeRouter.set(url);
  },
  refresh: () => undefined,
  back: () => undefined,
  prefetch: () => undefined,
};

export const navigation = {
  usePathname: () => new URL(fakeRouter.url, "http://app.test").pathname,
  useSearchParams: () => {
    const url = useSyncExternalStore(subscribe, () => fakeRouter.url);
    return new URLSearchParams(new URL(url, "http://app.test").search);
  },
  useRouter: () => router,
  useParams: () => ({}),
};
