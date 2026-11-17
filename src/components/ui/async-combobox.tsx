"use client";

import * as React from "react";
import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { SEARCH_DEBOUNCE_MS } from "@/components/data-table/use-list-params";
import {
  ComboboxItem,
  ComboboxTrigger,
  pick,
  selectedValues,
  type ComboboxOption,
  type ComboboxSelection,
  type ComboboxTriggerProps,
} from "@/components/ui/combobox";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  statusRowClasses,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";

// A combobox whose options come from the server, a page at a time: the search
// is debounced, the next page loads when the list is scrolled to its end, and
// a failed load shows a Retry row. `resolveLabels` names values that were
// chosen before the options were loaded (an edit form), so the trigger shows
// labels, not ids. Matches the backend options endpoint:
// GET /v1/<module>/options?search=&ids=&page=&size=.

type OptionsPage = { items: ComboboxOption[]; has_next: boolean };

type FetchOptions = (query: {
  search: string;
  page: number;
  signal: AbortSignal;
}) => Promise<OptionsPage>;

type ResolveLabels = (values: string[]) => Promise<ComboboxOption[]>;

type LoadState = {
  /** The search the items belong to. */
  search: string;
  items: ComboboxOption[];
  page: number;
  hasNext: boolean;
  status: "loading" | "loadingMore" | "done" | "error";
};

const IDLE: LoadState = {
  search: "",
  items: [],
  page: 0,
  hasNext: false,
  status: "loading",
};

/** How close to the end of the list, in pixels, the next page starts loading. */
const LOAD_MORE_EDGE = 48;

/**
 * The searchable, paged list on its own: what AsyncCombobox shows in its
 * popover, for places that show the list inline (a filter panel). It loads
 * when it mounts and stops when it unmounts.
 */
function AsyncOptions({
  fetchOptions,
  selection,
  onPicked,
  onLoaded,
  searchPlaceholder,
  emptyText,
}: {
  fetchOptions: FetchOptions;
  selection: ComboboxSelection;
  /** After a pick; `done` is true when a single choice was made. */
  onPicked?: (done: boolean) => void;
  /** Every loaded page, so the caller can remember labels. */
  onLoaded?: (items: ComboboxOption[]) => void;
  searchPlaceholder?: string | undefined;
  emptyText?: string | undefined;
}) {
  const t = useTranslations("forms.picker");
  const chosen = selectedValues(selection);
  const multiple = selection.multiple === true;
  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [state, setState] = React.useState<LoadState>(IDLE);
  const abort = React.useRef<AbortController | null>(null);
  const loaded = React.useRef(onLoaded);
  loaded.current = onLoaded;

  const load = React.useCallback(
    (query: string, page: number) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setState((prev) =>
        page === 1
          ? { ...IDLE, search: query }
          : { ...prev, status: "loadingMore" },
      );
      fetchOptions({ search: query, page, signal: controller.signal }).then(
        (result) => {
          if (controller.signal.aborted) {
            return;
          }
          loaded.current?.(result.items);
          setState((prev) => ({
            search: query,
            items: page === 1 ? result.items : [...prev.items, ...result.items],
            page,
            hasNext: result.has_next,
            status: "done",
          }));
        },
        () => {
          if (!controller.signal.aborted) {
            setState((prev) => ({ ...prev, status: "error" }));
          }
        },
      );
    },
    [fetchOptions],
  );

  // Debounce typing into the search that is sent.
  React.useEffect(() => {
    const id = setTimeout(() => {
      setSearch(input);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
    };
  }, [input]);

  React.useEffect(() => {
    load(search, 1);
    return () => abort.current?.abort();
  }, [search, load]);

  const loadMore = (list: HTMLElement) => {
    const nearEnd =
      list.scrollHeight - list.scrollTop - list.clientHeight < LOAD_MORE_EDGE;
    if (nearEnd && state.hasNext && state.status === "done") {
      load(state.search, state.page + 1);
    }
  };

  const retry = () => {
    load(state.search, state.items.length === 0 ? 1 : state.page + 1);
  };

  return (
    <Command shouldFilter={false}>
      <CommandInput
        value={input}
        onValueChange={setInput}
        placeholder={searchPlaceholder ?? t("search")}
      />
      <CommandList
        aria-multiselectable={multiple || undefined}
        aria-busy={state.status === "loading" || undefined}
        onScroll={(event) => {
          loadMore(event.currentTarget);
        }}
      >
        {state.items.map((option) => (
          <ComboboxItem
            key={option.value}
            option={option}
            selected={chosen.includes(option.value)}
            onPick={() => {
              // Pick first: an optional call skips its arguments when there is no handler.
              const done = pick(selection, option.value);
              onPicked?.(done);
            }}
          />
        ))}
        {(state.status === "loading" || state.status === "loadingMore") && (
          <div role="status" className={statusRowClasses}>
            <Spinner decorative />
            {state.status === "loading" ? t("loading") : t("loadingMore")}
          </div>
        )}
        {state.status === "done" && state.items.length === 0 && (
          <div role="status" className={statusRowClasses}>
            {emptyText ?? t("empty")}
          </div>
        )}
        {state.status === "error" && (
          <>
            <div role="alert" className={statusRowClasses}>
              {t("error")}
            </div>
            <CommandItem
              value="retry"
              onSelect={retry}
              className="justify-center"
            >
              <RotateCw aria-hidden="true" />
              {t("retry")}
            </CommandItem>
          </>
        )}
      </CommandList>
    </Command>
  );
}

function AsyncCombobox({
  fetchOptions,
  resolveLabels,
  searchPlaceholder,
  emptyText,
  ...rest
}: ComboboxSelection &
  ComboboxTriggerProps & {
    fetchOptions: FetchOptions;
    resolveLabels?: ResolveLabels;
    searchPlaceholder?: string;
    emptyText?: string;
  }) {
  const { multiple, value, onValueChange, ...triggerProps } = rest;
  const selection = { multiple, value, onValueChange } as ComboboxSelection;
  const chosen = selectedValues(selection);
  const [open, setOpen] = React.useState(false);
  const labels = useOptionLabels(chosen, resolveLabels);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ComboboxTrigger
          {...triggerProps}
          labels={chosen.map((v) => labels.of(v))}
          multiple={multiple === true}
          open={open}
        />
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <AsyncOptions
          fetchOptions={fetchOptions}
          selection={selection}
          searchPlaceholder={searchPlaceholder}
          emptyText={emptyText}
          onLoaded={labels.remember}
          onPicked={(done) => {
            if (done) {
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Labels for chosen values: remembered from loaded options, and asked of
 * `resolveLabels` (once each) for values chosen before any options loaded.
 */
function useOptionLabels(chosen: readonly string[], resolve?: ResolveLabels) {
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const asked = React.useRef(new Set<string>());
  const remember = React.useCallback((items: ComboboxOption[]) => {
    setLabels((prev) => {
      const next = { ...prev };
      for (const item of items) {
        next[item.value] = item.label;
      }
      return next;
    });
  }, []);

  const missingKey = chosen
    .filter((v) => labels[v] === undefined && !asked.current.has(v))
    .join(",");
  React.useEffect(() => {
    if (!resolve || missingKey === "") {
      return;
    }
    const ids = missingKey.split(",");
    for (const id of ids) {
      asked.current.add(id);
    }
    resolve(ids).then(remember, () => undefined);
  }, [missingKey, resolve, remember]);

  return { of: (v: string) => labels[v] ?? v, remember };
}

export {
  AsyncCombobox,
  AsyncOptions,
  useOptionLabels,
  type FetchOptions,
  type OptionsPage,
  type ResolveLabels,
};
