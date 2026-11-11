// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ListParamsConfig,
  SEARCH_DEBOUNCE_MS,
  listQuery,
  nextSort,
  parseListParams,
  serializeListParams,
  useListParams,
} from "@/components/data-table/use-list-params";

// A stand-in for the Next.js router: one URL, push/replace change it and
// re-render every component that reads the search params.
const nav = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = {
    url: "/admin/users",
    calls: [] as { mode: "push" | "replace"; url: string }[],
    set(url: string) {
      state.url = url;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return state;
});

vi.mock("next/navigation", () => ({
  usePathname: () => new URL(nav.url, "http://app.test").pathname,
  useSearchParams: () => {
    const url = useSyncExternalStore(
      (listener) => nav.subscribe(listener),
      () => nav.url,
    );
    return new URLSearchParams(new URL(url, "http://app.test").search);
  },
  useRouter: () => ({
    push: (url: string) => {
      nav.calls.push({ mode: "push", url });
      nav.set(url);
    },
    replace: (url: string) => {
      nav.calls.push({ mode: "replace", url });
      nav.set(url);
    },
  }),
}));

const config: ListParamsConfig = {
  filters: ["search", "status", "role"],
  searchKey: "search",
};

function start(url: string) {
  nav.url = url;
  nav.calls = [];
  return renderHook(() => useListParams(config));
}

describe("parseListParams and serializeListParams", () => {
  it("reads page, size, sort and the known filters", () => {
    expect(
      parseListParams(
        new URLSearchParams(
          "page=3&size=50&sort=display_name,DESC&status=active&other=x",
        ),
        config,
      ),
    ).toEqual({
      page: 3,
      size: 50,
      sort: "display_name,DESC",
      filters: { status: "active" },
    });
  });

  it("falls back on bad values and caps the size at 100", () => {
    expect(
      parseListParams(new URLSearchParams("page=-1&size=500"), config),
    ).toEqual({ page: 1, size: 100, filters: {} });
    expect(
      parseListParams(new URLSearchParams("page=abc&size=0"), config),
    ).toEqual({ page: 1, size: 25, filters: {} });
  });

  it("leaves defaults out of the URL", () => {
    expect(
      serializeListParams({ page: 1, size: 25, filters: {} }, config),
    ).toBe("");
    expect(
      serializeListParams(
        { page: 2, size: 50, sort: "created_at,ASC", filters: { role: "r1" } },
        config,
      ),
    ).toBe("page=2&size=50&sort=created_at%2CASC&role=r1");
  });

  it("builds the API query with the names identity expects", () => {
    expect(
      listQuery({
        page: 2,
        size: 25,
        sort: "display_name,ASC",
        filters: { membership_status: "invited" },
      }),
    ).toEqual({
      page: 2,
      size: 25,
      sort: "display_name,ASC",
      membership_status: "invited",
    });
  });

  it("cycles a column's sort: ascending, descending, none", () => {
    expect(nextSort(undefined, "display_name")).toBe("display_name,ASC");
    expect(nextSort("display_name,ASC", "display_name")).toBe(
      "display_name,DESC",
    );
    expect(nextSort("display_name,DESC", "display_name")).toBeUndefined();
    expect(nextSort("created_at,DESC", "display_name")).toBe(
      "display_name,ASC",
    );
  });
});

describe("useListParams", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("FE-40 reads the list state from the URL, so a reload keeps it", () => {
    const { result } = start(
      "/admin/users?page=3&status=active&sort=display_name,DESC",
    );
    expect(result.current.params).toEqual({
      page: 3,
      size: 25,
      sort: "display_name,DESC",
      filters: { status: "active" },
    });
    expect(result.current.hasFilters).toBe(true);
  });

  it("goes back to page 1 when a filter changes, as a new history entry", () => {
    const { result } = start("/admin/users?page=3&status=active");
    act(() => {
      result.current.setFilter("role", "r1");
    });
    expect(nav.calls).toEqual([
      { mode: "push", url: "/admin/users?status=active&role=r1" },
    ]);
    expect(result.current.params.page).toBe(1);
    expect(result.current.params.filters).toEqual({
      status: "active",
      role: "r1",
    });
  });

  it("keeps both of two quick changes made before the URL updates", () => {
    const { result } = start("/admin/users?page=2");
    const { setFilter, setSort } = result.current;
    act(() => {
      setFilter("status", "active");
      setFilter("role", "r1");
      setSort("display_name,ASC");
    });
    expect(nav.url).toBe(
      "/admin/users?sort=display_name%2CASC&status=active&role=r1",
    );
  });

  it("removes a filter set to empty, and clears all filters", () => {
    const { result } = start("/admin/users?status=active&role=r1");
    act(() => {
      result.current.setFilter("status", "");
    });
    expect(nav.url).toBe("/admin/users?role=r1");
    act(() => {
      result.current.clearFilters();
    });
    expect(nav.url).toBe("/admin/users");
  });

  it("keeps the filters when the page or size changes", () => {
    const { result } = start("/admin/users?status=active");
    act(() => {
      result.current.setPage(2);
    });
    expect(nav.url).toBe("/admin/users?page=2&status=active");
    act(() => {
      result.current.setSize(50);
    });
    expect(nav.url).toBe("/admin/users?size=50&status=active");
  });

  it("debounces search and replaces the history entry", () => {
    const { result } = start("/admin/users?page=4");
    act(() => {
      result.current.search.onChange("di");
    });
    act(() => {
      result.current.search.onChange("dina");
    });
    expect(result.current.search.value).toBe("dina");
    expect(nav.calls).toEqual([]);
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(nav.calls).toEqual([
      { mode: "replace", url: "/admin/users?search=dina" },
    ]);
    expect(result.current.params.filters.search).toBe("dina");
  });

  it("follows a URL change from elsewhere, such as the back button", () => {
    const { result } = start("/admin/users?search=dina");
    expect(result.current.search.value).toBe("dina");
    act(() => {
      nav.set("/admin/users?search=old");
    });
    expect(result.current.search.value).toBe("old");
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS * 2);
    });
    expect(nav.calls).toEqual([]);
  });
});
