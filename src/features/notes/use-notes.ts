"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { decodeFilter, encodeFilter } from "@/components/filters/filters";
import type {
  FetchOptions,
  ResolveLabels,
} from "@/components/ui/async-combobox";
import { createServiceClient, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";
import type {
  NewNote,
  Note,
  NoteChange,
  NoteStatus,
  NotesBulkDeleted,
  NotesPaths,
} from "@/features/notes/types";

// Data for the example notes module, through the BFF proxy at /api/notes
// (src/app/api/notes/[...path]/route.ts). go-service-template scopes notes
// to the caller's tenant and, without the `:any` keys, to the caller.

export const notesApi = createServiceClient<NotesPaths>("/api/notes");

/** The filters the notes list keeps in the URL. */
export const NOTE_FILTERS = [
  "search",
  "status",
  "title",
  "created_at",
  "id",
] as const;

/** The operators GET /v1/notes accepts on `title`. */
export const NOTE_TITLE_OPERATORS = ["like", "eq", "ne"] as const;

export const NOTE_STATUSES = [
  "draft",
  "archived",
] as const satisfies readonly NoteStatus[];

/** go-service-template's CreateNoteRequest: a title of at most 200 characters. */
export const NOTE_TITLE_MAX = 200;

export function isNoteStatus(value: string | undefined): value is NoteStatus {
  return NOTE_STATUSES.some((status) => status === value);
}

/**
 * A day range (`from,to;between`, yyyy-mm-dd) as the API's inclusive
 * `created_at` range: the API reads a bare date as midnight UTC, so the last
 * day runs to its final millisecond.
 */
function createdAtQuery(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const { op, items } = decodeFilter(value);
  const [from, to] = items;
  if (op !== "between" || !from || !to) {
    return undefined;
  }
  return encodeFilter("between", [from, `${to}T23:59:59.999Z`]);
}

/** The filters for `GET /v1/notes`; a value the API would refuse is left out. */
function notesFilters(params: ListParams) {
  const { search, status, title, id } = params.filters;
  const createdAt = createdAtQuery(params.filters.created_at);
  return {
    ...(isNoteStatus(status) ? { status } : {}),
    ...(search ? { search } : {}),
    ...(title ? { title } : {}),
    ...(id ? { id } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
  };
}

/** The query for `GET /v1/notes`. */
export function notesQuery(params: ListParams) {
  const sort = typeof params.sort === "string" ? [params.sort] : params.sort;
  return {
    page: params.page,
    size: params.size,
    ...(sort ? { sort } : {}),
    ...notesFilters(params),
  };
}

/** The list's filters as the query string bulk delete takes. */
export function notesFilterString(params: ListParams): string {
  return new URLSearchParams(notesFilters(params)).toString();
}

/** Notes for a dropdown, a page at a time (`GET /v1/notes/options`). */
export const fetchNoteOptions: FetchOptions = async ({
  search,
  page,
  signal,
}) => {
  const options = await unwrapPage(
    notesApi.GET("/notes/options", {
      params: { query: { page, ...(search ? { search } : {}) } },
      signal,
    }),
  );
  return {
    items: options.items.map(toOption),
    has_next: options.has_next,
  };
};

/** Labels for notes already chosen, e.g. ids restored from the URL. */
export const resolveNoteLabels: ResolveLabels = async (ids) => {
  const options = await unwrapPage(
    notesApi.GET("/notes/options", {
      params: { query: { ids: ids.join(",") } },
    }),
  );
  return options.items.map(toOption);
};

function toOption(option: { value?: string; label?: string }) {
  return { value: option.value ?? "", label: option.label ?? "" };
}

/** One page of notes. The previous page stays while the next loads. */
export function useNotes(params: ListParams) {
  return useQuery({
    queryKey: queryKeys.notes.list(params),
    queryFn: () =>
      unwrapPage(
        notesApi.GET("/notes", { params: { query: notesQuery(params) } }),
      ),
    staleTime: staleTimes.notes,
    placeholderData: keepPreviousData,
  });
}

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.notes.all });
}

/** `POST /v1/notes`; needs `notes:write`. */
export function useCreateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (note: NewNote) =>
      unwrap(notesApi.POST("/notes", { body: note })),
    onSuccess: invalidate,
  });
}

/** The `If-Match` value for a version (TRD 8.5). */
export function ifMatch(version: number | undefined): string {
  return `"${String(version ?? 0)}"`;
}

/** `PATCH /v1/notes/{id}` with `If-Match` at the version shown. */
export function useUpdateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: ({ note, change }: { note: Note; change: NoteChange }) =>
      unwrap(
        notesApi.PATCH("/notes/{id}", {
          params: {
            path: { id: note.id ?? "" },
            header: { "If-Match": ifMatch(note.version) },
          },
          body: change,
        }),
      ),
    onSettled: invalidate,
  });
}

/**
 * `POST /v1/notes/bulk-delete`: the chosen ids, or with `allMatching` every
 * note the list's filters match (at most 1000; above that `TOO_MANY_ROWS`).
 */
export function useBulkDeleteNotes() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (
      target: { ids: readonly string[] } | { filter: string },
    ): Promise<NotesBulkDeleted> =>
      unwrap(
        notesApi.POST("/notes/bulk-delete", {
          body: "ids" in target ? { ids: [...target.ids] } : target,
        }),
      ),
    onSettled: invalidate,
  });
}

/** `DELETE /v1/notes/{id}`. */
export function useDeleteNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (note: Note) =>
      unwrap(
        notesApi.DELETE("/notes/{id}", {
          params: { path: { id: note.id ?? "" } },
        }),
      ),
    onSuccess: invalidate,
  });
}
