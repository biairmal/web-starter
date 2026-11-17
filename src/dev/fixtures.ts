import type {
  FetchOptions,
  ResolveLabels,
} from "@/components/ui/async-combobox";
import { useEffect, useState } from "react";
import type { PageQuery } from "@/components/data-table/data-table";
import { sortList } from "@/components/data-table/use-list-params";
import {
  decodeFilter,
  type FilterOperator,
} from "@/components/filters/filters";
import type { ComboboxOption } from "@/components/ui/combobox";
import type { UploadFile } from "@/components/ui/file-upload";
import type { ListParams } from "@/lib/api/query-keys";
import type { Page } from "@/lib/api/types";

// Fake data and fetchers for the component gallery, so it runs without a
// backend. Delays are short but real, so loading states show.

const FIRST = [
  "Ayu",
  "Budi",
  "Citra",
  "Dimas",
  "Eka",
  "Fajar",
  "Gita",
  "Hadi",
  "Indah",
  "Joko",
];
const LAST = [
  "Lestari",
  "Santoso",
  "Dewi",
  "Pratama",
  "Putri",
  "Nugroho",
  "Wijaya",
  "Saputra",
];

/** 80 people, so the async list has several pages. */
export const PEOPLE: ComboboxOption[] = FIRST.flatMap((first, i) =>
  LAST.map((last, j) => ({
    value: `u_${String(i * LAST.length + j + 1).padStart(3, "0")}`,
    label: `${first} ${last}`,
  })),
);

export const COUNTRIES: ComboboxOption[] = [
  "Indonesia",
  "Malaysia",
  "Singapore",
  "Thailand",
  "Vietnam",
  "Philippines",
  "Japan",
  "South Korea",
  "Australia",
  "New Zealand",
].map((label) => ({ value: label.toLowerCase().replace(/ /g, "-"), label }));

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

const PAGE_SIZE = 20;

/** A paged people search. `failEvery` fails the first call and every nth after, to show Retry. */
export function fakePeopleFetcher(failEvery = 0): FetchOptions {
  let calls = 0;
  return async ({ search, page, signal }) => {
    await wait(400, signal);
    calls += 1;
    if (failEvery > 0 && (calls - 1) % failEvery === 0) {
      throw new Error("Network request failed");
    }
    const needle = search.trim().toLowerCase();
    const matches = PEOPLE.filter((p) =>
      p.label.toLowerCase().includes(needle),
    );
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: matches.slice(start, start + PAGE_SIZE),
      has_next: start + PAGE_SIZE < matches.length,
    };
  };
}

export const resolvePeople: ResolveLabels = async (values) => {
  await wait(300);
  return PEOPLE.filter((p) => values.includes(p.value));
};

export type Order = {
  id: string;
  customer: string;
  status: "paid" | "pending" | "refunded" | "failed";
  region: string;
  channel: string;
  items: number;
  amount: number;
  created_at: string;
  owner: string;
  owner_id: string;
};

const STATUSES: Order["status"][] = ["paid", "pending", "refunded", "failed"];
const CHANNELS = ["Web", "Mobile app", "Partner", "Phone"];
const DAY_MS = 86_400_000;

/** 10,000 orders, the same on every load, for the data table demo. */
export const ORDERS: Order[] = Array.from({ length: 10_000 }, (_, i) => {
  // A fixed pseudo-random spread, so sorting shows real reordering.
  const n = (i * 2_654_435_761) % 4_294_967_296;
  const pick = <T>(list: readonly T[], salt: number) =>
    list[(n >>> salt) % list.length] as T;
  return {
    id: `ord_${String(i + 1).padStart(5, "0")}`,
    customer: pick(PEOPLE, 3).label,
    status: pick(STATUSES, 7),
    region: pick(COUNTRIES, 11).label,
    channel: pick(CHANNELS, 13),
    items: (n % 9) + 1,
    amount: (n % 500_000) / 100,
    created_at: new Date(Date.UTC(2026, 10, 17) - (n % 720) * DAY_MS)
      .toISOString()
      .slice(0, 10),
    owner: pick(PEOPLE, 17).label,
    owner_id: pick(PEOPLE, 17).value,
  };
});

const ORDER_SORTS = ["customer", "amount", "created_at", "status"] as const;

/** The value each filter key compares; `search` is a plain "contains". */
const ORDER_FIELDS: Record<string, (order: Order) => string | number> = {
  search: (o) => o.customer,
  customer: (o) => o.customer,
  status: (o) => o.status,
  region: (o) => o.region,
  owner: (o) => o.owner_id,
  created_at: (o) => o.created_at,
  amount: (o) => o.amount,
};

/** One condition, as the backend list query would apply it. */
function holds(
  actual: string | number,
  op: FilterOperator,
  items: string[],
): boolean {
  const as = (item: string) =>
    typeof actual === "number" ? Number(item) : item;
  const [a = "", b = ""] = items;
  switch (op) {
    case "eq":
      return actual === as(a);
    case "ne":
      return actual !== as(a);
    case "like":
      return String(actual).toLowerCase().includes(a.toLowerCase());
    case "gt":
      return actual > as(a);
    case "gte":
      return actual >= as(a);
    case "lt":
      return actual < as(a);
    case "lte":
      return actual <= as(a);
    case "in":
      return items.includes(String(actual));
    case "between":
      return actual >= as(a) && actual <= as(b);
  }
}

function matches(order: Order, filters: Record<string, string>) {
  return Object.entries(filters).every(([key, raw]) => {
    const field = ORDER_FIELDS[key];
    if (!field) {
      return true;
    }
    const { op, items } =
      key === "search"
        ? { op: "like" as const, items: [raw] }
        : decodeFilter(raw);
    return holds(field(order), op, items);
  });
}

function orderPage(params: ListParams): Page<Order> {
  const sorts = sortList(params.sort).filter((s) =>
    (ORDER_SORTS as readonly string[]).includes(s.field),
  );
  const rows = ORDERS.filter((order) => matches(order, params.filters)).sort(
    (a, b) => {
      for (const { field, direction } of sorts) {
        const key = field as (typeof ORDER_SORTS)[number];
        const order = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
        if (order !== 0) {
          return direction === "ASC" ? order : -order;
        }
      }
      return 0;
    },
  );
  const start = (params.page - 1) * params.size;
  const total_pages = Math.max(1, Math.ceil(rows.length / params.size));
  return {
    items: rows.slice(start, start + params.size),
    total: rows.length,
    page: params.page,
    size: params.size,
    total_pages,
    has_prev: params.page > 1,
    has_next: params.page < total_pages,
  };
}

/** A fake server-paged order list: filtered, sorted, paged and a little slow. */
export function useFakeOrders(
  params: ListParams,
): PageQuery<Order> & { isFetching: boolean } {
  const key = JSON.stringify(params);
  const [data, setData] = useState<Page<Order>>();
  const [loadedKey, setLoadedKey] = useState<string>();
  useEffect(() => {
    const id = setTimeout(() => {
      setData(orderPage(JSON.parse(key) as ListParams));
      setLoadedKey(key);
    }, 350);
    return () => {
      clearTimeout(id);
    };
  }, [key]);
  return {
    data,
    isPending: data === undefined,
    isFetching: loadedKey !== key,
    isError: false,
    error: null,
    refetch: () => undefined,
  };
}

let uploads = 0;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Could not read the file"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * A pretend upload that reports progress over about two seconds. With
 * `flaky`, each file's first try fails halfway, to show Retry. Images come
 * back with a data URL so the stored file has a thumbnail.
 */
export function fakeUploader(flaky = false): UploadFile {
  const tried = new WeakSet<File>();
  return async (file, { onProgress, signal }) => {
    const fails = flaky && !tried.has(file);
    tried.add(file);
    for (let step = 1; step <= 10; step += 1) {
      await wait(200, signal);
      onProgress(step / 10);
      if (fails && step === 6) {
        throw new Error("Network request failed");
      }
    }
    uploads += 1;
    return {
      id: `file_${String(uploads)}`,
      ...(file.type.startsWith("image/")
        ? { url: await readAsDataUrl(file) }
        : {}),
    };
  };
}
