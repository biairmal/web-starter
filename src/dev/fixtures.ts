import type {
  FetchOptions,
  ResolveLabels,
} from "@/components/ui/async-combobox";
import type { ComboboxOption } from "@/components/ui/combobox";

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
