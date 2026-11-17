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
  const t = useTranslations("forms.picker");
  const { multiple, value, onValueChange, ...triggerProps } = rest;
  const selection = { multiple, value, onValueChange } as ComboboxSelection;
  const chosen = selectedValues(selection);

  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [state, setState] = React.useState<LoadState>(IDLE);
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const abort = React.useRef<AbortController | null>(null);
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
          remember(result.items);
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
    [fetchOptions, remember],
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
    if (open) {
      load(search, 1);
    }
    return () => abort.current?.abort();
  }, [open, search, load]);

  // Name chosen values the options have not named yet, once each.
  const missing = chosen.filter(
    (v) => labels[v] === undefined && !asked.current.has(v),
  );
  const missingKey = missing.join(",");
  React.useEffect(() => {
    if (!resolveLabels || missingKey === "") {
      return;
    }
    const ids = missingKey.split(",");
    for (const id of ids) {
      asked.current.add(id);
    }
    resolveLabels(ids).then(remember, () => undefined);
  }, [missingKey, resolveLabels, remember]);

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
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setInput("");
          setSearch("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <ComboboxTrigger
          {...triggerProps}
          labels={chosen.map((v) => labels[v] ?? v)}
          multiple={multiple === true}
          open={open}
        />
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={input}
            onValueChange={setInput}
            placeholder={searchPlaceholder ?? t("search")}
          />
          <CommandList
            aria-multiselectable={multiple === true || undefined}
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
                  if (pick(selection, option.value)) {
                    setOpen(false);
                  }
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
      </PopoverContent>
    </Popover>
  );
}

export {
  AsyncCombobox,
  type FetchOptions,
  type OptionsPage,
  type ResolveLabels,
};
