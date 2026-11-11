"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListParams } from "@/lib/api/query-keys";

// List state mirrored in the query string, so views can be shared and the
// back button works (FE-40, APP_FLOW 7). Parameter names match the API
// (`page`, `size`, `sort=field,ASC|DESC`, filters), and identity rejects
// fields it does not allow.

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
/** Typing in search waits this long before it changes the URL. */
export const SEARCH_DEBOUNCE_MS = 300;

export type ListParamsConfig = {
  /** The filter names this list accepts, e.g. `["search", "status", "role"]`. */
  filters: readonly string[];
  /** The filter fed by the debounced search box. */
  searchKey?: string;
  defaultSize?: number;
};

export type SortDirection = "ASC" | "DESC";

function positiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return max === undefined ? parsed : Math.min(parsed, max);
}

/** Reads list state from a query string; unknown or bad values fall back. */
export function parseListParams(
  search: URLSearchParams,
  config: ListParamsConfig,
): ListParams {
  const defaultSize = config.defaultSize ?? DEFAULT_PAGE_SIZE;
  const filters: Record<string, string> = {};
  for (const key of config.filters) {
    const value = search.get(key);
    if (value !== null && value !== "") {
      filters[key] = value;
    }
  }
  const sort = search.get("sort");
  return {
    page: positiveInt(search.get("page"), 1),
    size: positiveInt(search.get("size"), defaultSize, 100),
    ...(sort ? { sort } : {}),
    filters,
  };
}

/** The query string for list state; defaults are left out to keep URLs short. */
export function serializeListParams(
  params: ListParams,
  config: ListParamsConfig,
): string {
  const query = new URLSearchParams();
  if (params.page > 1) {
    query.set("page", String(params.page));
  }
  if (params.size !== (config.defaultSize ?? DEFAULT_PAGE_SIZE)) {
    query.set("size", String(params.size));
  }
  if (params.sort) {
    query.set("sort", params.sort);
  }
  for (const key of config.filters) {
    const value = params.filters[key];
    if (value) {
      query.set(key, value);
    }
  }
  return query.toString();
}

/** The query object for the identity list call (`api.GET(…, { params: { query } })`). */
export function listQuery(params: ListParams): Record<string, string | number> {
  return {
    page: params.page,
    size: params.size,
    ...(params.sort ? { sort: params.sort } : {}),
    ...params.filters,
  };
}

/** `"field,ASC"` → `{ field, direction }`. */
export function parseSort(
  sort: string | undefined,
): { field: string; direction: SortDirection } | undefined {
  if (!sort) {
    return undefined;
  }
  const [field = "", direction = "ASC"] = sort.split(",");
  return field
    ? { field, direction: direction.toUpperCase() === "DESC" ? "DESC" : "ASC" }
    : undefined;
}

/** None → ascending → descending → none, for one column. */
export function nextSort(
  current: string | undefined,
  field: string,
): string | undefined {
  const parsed = parseSort(current);
  if (parsed?.field !== field) {
    return `${field},ASC`;
  }
  return parsed.direction === "ASC" ? `${field},DESC` : undefined;
}

export function useListParams(config: ListParamsConfig) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const configRef = useRef(config);
  configRef.current = config;

  const queryString = searchParams.toString();
  const params = useMemo(
    () => parseListParams(new URLSearchParams(queryString), configRef.current),
    [queryString],
  );

  // Changes build on the last state asked for, not the last one rendered:
  // the router updates the URL a moment later, and two quick changes (a tab,
  // then a select) must not drop the first. Once the URL catches up, or
  // changes from elsewhere (back button), it is the state again.
  const latest = useRef(params);
  const pending = useRef<string | undefined>(undefined);
  useEffect(() => {
    const current = serializeListParams(params, configRef.current);
    if (pending.current === undefined || pending.current === current) {
      pending.current = undefined;
      latest.current = params;
    }
  }, [params]);

  const navigate = useCallback(
    (next: ListParams, mode: "push" | "replace") => {
      const query = serializeListParams(next, configRef.current);
      latest.current = next;
      pending.current = query;
      router[mode](query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const setPage = useCallback(
    (page: number) => {
      navigate({ ...latest.current, page }, "push");
    },
    [navigate],
  );

  const setSize = useCallback(
    (size: number) => {
      navigate({ ...latest.current, size, page: 1 }, "push");
    },
    [navigate],
  );

  const setSort = useCallback(
    (sort: string | undefined) => {
      navigate(
        {
          page: 1,
          size: latest.current.size,
          filters: latest.current.filters,
          ...(sort ? { sort } : {}),
        },
        "push",
      );
    },
    [navigate],
  );

  /** Any filter change goes back to page 1. An empty value removes the filter. */
  const setFilter = useCallback(
    (key: string, value: string, mode: "push" | "replace" = "push") => {
      const others = Object.entries(latest.current.filters).filter(
        ([name]) => name !== key,
      );
      const filters = Object.fromEntries(
        value ? [...others, [key, value]] : others,
      );
      navigate({ ...latest.current, filters, page: 1 }, mode);
    },
    [navigate],
  );

  const clearFilters = useCallback(() => {
    navigate({ ...latest.current, filters: {}, page: 1 }, "push");
  }, [navigate]);

  // The search box shows what the user types at once; the URL follows after
  // a pause. A URL change from elsewhere (back button) updates the box.
  const searchKey = config.searchKey;
  const urlSearch = searchKey ? (params.filters[searchKey] ?? "") : "";
  const [searchDraft, setSearchDraft] = useState(urlSearch);
  const committed = useRef(urlSearch);
  useEffect(() => {
    if (urlSearch !== committed.current) {
      committed.current = urlSearch;
      setSearchDraft(urlSearch);
    }
  }, [urlSearch]);
  useEffect(() => {
    if (!searchKey || searchDraft === committed.current) {
      return;
    }
    const timer = setTimeout(() => {
      committed.current = searchDraft;
      setFilter(searchKey, searchDraft, "replace");
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [searchDraft, searchKey, setFilter]);

  return {
    params,
    setPage,
    setSize,
    setSort,
    setFilter,
    clearFilters,
    hasFilters: Object.keys(params.filters).length > 0,
    search: { value: searchDraft, onChange: setSearchDraft },
  };
}
