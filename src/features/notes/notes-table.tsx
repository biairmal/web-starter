"use client";

import { NotebookPen, Pin, SearchX, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/feedback/toast";
import { useCan } from "@/components/auth/can";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import {
  NO_SELECTION,
  type RowSelection,
  selectionCount,
  useRowSelection,
} from "@/components/data-table/selection";
import { RowActions } from "@/components/data-table/row-actions";
import { useListParams } from "@/components/data-table/use-list-params";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { FilterBar } from "@/components/filters/filter-bar";
import type { FilterDef } from "@/components/filters/filters";
import { FilterTabs } from "@/components/filters/filter-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { NOTES_WRITE } from "@/lib/authz/permissions";
import { CreateNoteDialog } from "@/features/notes/create-note-dialog";
import type { Note, NoteChange } from "@/features/notes/types";
import {
  NOTE_FILTERS,
  NOTE_STATUSES,
  NOTE_TITLE_OPERATORS,
  fetchNoteOptions,
  isNoteStatus,
  notesFilterString,
  resolveNoteLabels,
  useBulkDeleteNotes,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "@/features/notes/use-notes";

// The example module's one screen: the caller's notes (or the tenant's, with
// notes:read:any), with status tabs, a search, filters with operators and a
// multi-column sort in the URL. Holders of notes:write create, pin, archive
// and delete, one note or a selection at a time.

const LIST_CONFIG = { filters: NOTE_FILTERS, searchKey: "search" } as const;

function StatusPill({ status }: { status: Note["status"] }) {
  const t = useTranslations("notes.status");
  return (
    <Badge variant={status === "archived" ? "neutral" : "positive"}>
      {isNoteStatus(status) ? t(status) : (status ?? t("unknown"))}
    </Badge>
  );
}

function NoteTitle({ note }: { note: Note }) {
  const t = useTranslations("notes.table");
  return (
    <div className="flex min-w-0 flex-col py-1.5">
      <span className="flex items-center gap-1.5 font-medium">
        {note.pinned && (
          <Pin
            aria-label={t("pinned")}
            className="size-3.5 shrink-0 text-muted-foreground"
          />
        )}
        {note.title}
      </span>
      {note.body && (
        <span className="line-clamp-1 text-small text-muted-foreground">
          {note.body}
        </span>
      )}
    </div>
  );
}

function RowMenu({
  note,
  onChange,
  onDelete,
}: {
  note: Note;
  onChange: (note: Note, change: NoteChange) => void;
  onDelete: (note: Note) => void;
}) {
  const t = useTranslations("notes.table");
  return (
    <RowActions
      name={note.title ?? ""}
      actions={[
        {
          id: "pin",
          label: note.pinned ? t("unpin") : t("pin"),
          onSelect: () => {
            onChange(note, { pinned: !note.pinned });
          },
        },
        {
          id: "archive",
          label: note.status === "archived" ? t("restore") : t("archive"),
          onSelect: () => {
            onChange(note, {
              status: note.status === "archived" ? "draft" : "archived",
            });
          },
        },
        {
          id: "delete",
          label: t("delete"),
          destructive: true,
          onSelect: () => {
            onDelete(note);
          },
        },
      ]}
    />
  );
}

export function NotesTable() {
  const t = useTranslations("notes.table");
  const tFilters = useTranslations("notes.filters");
  const format = useFormatter();
  const canWrite = useCan(NOTES_WRITE);
  const list = useListParams(LIST_CONFIG);
  const notes = useNotes(list.params);
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const errorToast = useErrorToast();
  const bulkDelete = useBulkDeleteNotes();
  const [deleting, setDeleting] = useState<Note | undefined>();
  const [selection, setSelection] = useRowSelection(
    JSON.stringify(list.params.filters),
  );
  const [bulkDeleting, setBulkDeleting] = useState<RowSelection | undefined>();
  const status = list.params.filters.status ?? "";

  const filterDefs: FilterDef[] = [
    {
      key: "title",
      label: tFilters("title"),
      type: "text",
      operators: NOTE_TITLE_OPERATORS,
    },
    { key: "created_at", label: tFilters("created"), type: "dateRange" },
    {
      key: "id",
      label: tFilters("notes"),
      type: "async",
      fetchOptions: fetchNoteOptions,
      resolveLabels: resolveNoteLabels,
      multiple: true,
    },
  ];

  const confirmBulkDelete = (chosen: RowSelection) => {
    bulkDelete.mutate(
      chosen.allMatching
        ? { filter: notesFilterString(list.params) }
        : { ids: chosen.ids },
      {
        onSuccess: (result) => {
          setBulkDeleting(undefined);
          setSelection(NO_SELECTION);
          toast.success(t("bulkDeleted", { count: result.affected ?? 0 }));
          const failed = result.failed ?? [];
          if (failed.length > 0) {
            toast.error(t("bulkFailed", { count: failed.length }));
          }
        },
        onError: (error) => {
          setBulkDeleting(undefined);
          if (isApiError(error) && error.reason === "TOO_MANY_ROWS") {
            toast.error(t("bulkTooMany"));
            return;
          }
          errorToast(error);
        },
      },
    );
  };

  const change = (note: Note, noteChange: NoteChange) => {
    update.mutate(
      { note, change: noteChange },
      {
        onError: (error) => {
          if (isApiError(error) && error.reason === "VERSION_CONFLICT") {
            toast.error(t("conflict"));
            return;
          }
          errorToast(error);
        },
      },
    );
  };

  const updated = (note: Note) =>
    note.updated_at
      ? format.dateTime(new Date(note.updated_at), { dateStyle: "medium" })
      : "–";

  const columns: DataTableColumn<Note>[] = [
    {
      id: "title",
      header: t("title"),
      sortField: "title",
      identity: true,
      cell: (note) => <NoteTitle note={note} />,
    },
    {
      id: "status",
      header: t("status"),
      sortField: "status",
      cell: (note) => <StatusPill status={note.status} />,
    },
    {
      id: "updated",
      header: t("updated"),
      sortField: "updated_at",
      align: "end",
      cell: updated,
    },
    ...(canWrite
      ? [
          {
            id: "actions",
            header: <span className="sr-only">{t("actionsHeader")}</span>,
            align: "end" as const,
            cell: (note: Note) => (
              <RowMenu note={note} onChange={change} onDelete={setDeleting} />
            ),
          },
        ]
      : []),
  ];

  const total = notes.data?.total;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-live="polite"
          className="min-h-5 text-body text-muted-foreground"
        >
          {total !== undefined && t("total", { count: total })}
        </p>
        {canWrite && <CreateNoteDialog />}
      </div>
      <FilterTabs
        label={tFilters("status")}
        value={status}
        options={(["", ...NOTE_STATUSES] as const).map((value) => ({
          value,
          label: tFilters(`tabs.${value || "all"}`),
        }))}
        onChange={(value) => {
          list.setFilter("status", value);
        }}
      />
      <FilterBar
        search={{
          value: list.search.value,
          onChange: list.search.onChange,
          label: tFilters("search"),
        }}
        filters={filterDefs}
        values={list.params.filters}
        onChange={(key, value) => {
          list.setFilter(key, value);
        }}
        onClear={list.clearFilters}
      />
      <DataTable
        columns={columns}
        query={notes}
        getRowId={(note) => note.id ?? ""}
        getRowLabel={(note) => note.title ?? ""}
        caption={t("caption")}
        errorTitle={t("loadFailed")}
        sort={list.params.sort}
        onSortChange={list.setSort}
        multiSort
        {...(canWrite
          ? {
              selectable: "multiple" as const,
              selection,
              onSelectionChange: setSelection,
              bulkActions: (chosen: RowSelection) => (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setBulkDeleting(chosen);
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  {t("bulkDelete")}
                </Button>
              ),
            }
          : {})}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
        mobileCard={(note) => ({
          title: <NoteTitle note={note} />,
          value: <StatusPill status={note.status} />,
          meta: [t("updatedShort", { updated: updated(note) })],
          ...(canWrite
            ? {
                action: (
                  <RowMenu
                    note={note}
                    onChange={change}
                    onDelete={setDeleting}
                  />
                ),
              }
            : {}),
        })}
        empty={
          list.hasFilters ? (
            <EmptyState
              icon={SearchX}
              title={t("noMatch")}
              description={t("noMatchBody")}
              action={
                <Button variant="outline" onClick={list.clearFilters}>
                  {tFilters("clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={NotebookPen}
              title={t("empty")}
              description={canWrite ? t("emptyBody") : t("emptyBodyReadOnly")}
            />
          )
        }
      />
      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(undefined);
          }
        }}
        title={t("deleteTitle", { title: deleting?.title ?? "" })}
        description={t("deleteBody")}
        confirmLabel={t("deleteConfirm")}
        destructive
        pending={remove.isPending}
        onConfirm={() => {
          if (!deleting) {
            return;
          }
          remove.mutate(deleting, {
            onSuccess: () => {
              setDeleting(undefined);
              toast.success(t("deleted"));
            },
            onError: errorToast,
          });
        }}
      />
      <ConfirmDialog
        open={bulkDeleting !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setBulkDeleting(undefined);
          }
        }}
        title={t("bulkDeleteTitle", {
          count: bulkDeleting ? selectionCount(bulkDeleting, total ?? 0) : 0,
        })}
        description={t("deleteBody")}
        confirmLabel={t("bulkDeleteConfirm")}
        destructive
        pending={bulkDelete.isPending}
        onConfirm={() => {
          if (bulkDeleting) {
            confirmBulkDelete(bulkDeleting);
          }
        }}
      />
    </div>
  );
}
