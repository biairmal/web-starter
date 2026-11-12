"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { createServiceClient, unwrap, unwrapPage } from "@/lib/api/client";
import { type ListParams, queryKeys, staleTimes } from "@/lib/api/query-keys";
import type {
  NewNote,
  Note,
  NoteChange,
  NoteStatus,
  NotesPaths,
} from "@/features/notes/types";

// Data for the example notes module, through the BFF proxy at /api/notes
// (src/app/api/notes/[...path]/route.ts). go-service-template scopes notes
// to the caller's tenant and, without the `:any` keys, to the caller.

export const notesApi = createServiceClient<NotesPaths>("/api/notes");

/** The filters the notes list keeps in the URL. */
export const NOTE_FILTERS = ["search", "status"] as const;

export const NOTE_STATUSES = [
  "draft",
  "archived",
] as const satisfies readonly NoteStatus[];

/** go-service-template's CreateNoteRequest: a title of at most 200 characters. */
export const NOTE_TITLE_MAX = 200;

export function isNoteStatus(value: string | undefined): value is NoteStatus {
  return NOTE_STATUSES.some((status) => status === value);
}

/** The query for `GET /v1/notes`; a value the API would refuse is left out. */
export function notesQuery(params: ListParams) {
  const { search, status } = params.filters;
  return {
    page: params.page,
    size: params.size,
    ...(isNoteStatus(status) ? { status } : {}),
    ...(search ? { search } : {}),
  };
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
