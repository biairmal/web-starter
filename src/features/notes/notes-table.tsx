"use client";

import {
  MoreHorizontal,
  NotebookPen,
  Pin,
  Search,
  SearchX,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useCan } from "@/components/auth/can";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { useListParams } from "@/components/data-table/use-list-params";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { isApiError } from "@/lib/api/errors";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { NOTES_WRITE } from "@/lib/authz/permissions";
import { cn } from "@/lib/utils";
import { CreateNoteDialog } from "@/features/notes/create-note-dialog";
import type { Note, NoteChange } from "@/features/notes/types";
import {
  NOTE_FILTERS,
  NOTE_STATUSES,
  isNoteStatus,
  useDeleteNote,
  useNotes,
  useUpdateNote,
} from "@/features/notes/use-notes";

// The example module's one screen: the caller's notes (or the tenant's, with
// notes:read:any), with status tabs and a search in the URL. Holders of
// notes:write create, pin, archive and delete.

const LIST_CONFIG = { filters: NOTE_FILTERS, searchKey: "search" } as const;

function StatusPill({ status }: { status: Note["status"] }) {
  const t = useTranslations("notes.status");
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-sm px-2 text-small font-medium whitespace-nowrap",
        status === "archived"
          ? "bg-pill-neutral text-pill-neutral-ink"
          : "bg-pill-positive text-pill-positive-ink",
      )}
    >
      {isNoteStatus(status) ? t(status) : (status ?? t("unknown"))}
    </span>
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("actions", { title: note.title ?? "" })}
        >
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => {
            onChange(note, { pinned: !note.pinned });
          }}
        >
          {note.pinned ? t("unpin") : t("pin")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            onChange(note, {
              status: note.status === "archived" ? "draft" : "archived",
            });
          }}
        >
          {note.status === "archived" ? t("restore") : t("archive")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            onDelete(note);
          }}
        >
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NotesTable() {
  const t = useTranslations("notes.table");
  const tFilters = useTranslations("notes.filters");
  const format = useFormatter();
  const searchId = useId();
  const canWrite = useCan(NOTES_WRITE);
  const list = useListParams(LIST_CONFIG);
  const notes = useNotes(list.params);
  const update = useUpdateNote();
  const remove = useDeleteNote();
  const errorToast = useErrorToast();
  const [deleting, setDeleting] = useState<Note | undefined>();
  const status = list.params.filters.status ?? "";

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
      identity: true,
      cell: (note) => <NoteTitle note={note} />,
    },
    {
      id: "status",
      header: t("status"),
      cell: (note) => <StatusPill status={note.status} />,
    },
    {
      id: "updated",
      header: t("updated"),
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
      <div
        role="group"
        aria-label={tFilters("status")}
        className="flex gap-4 overflow-x-auto border-b border-rule"
      >
        {(["", ...NOTE_STATUSES] as const).map((value) => {
          const active = status === value;
          return (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => {
                list.setFilter("status", value);
              }}
              className={cn(
                "-mb-px h-9 shrink-0 border-b-2 text-body focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tFilters(`tabs.${value || "all"}`)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-72">
          <label htmlFor={searchId} className="sr-only">
            {tFilters("search")}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={list.search.value}
            placeholder={tFilters("search")}
            autoComplete="off"
            spellCheck={false}
            className="ps-8"
            onChange={(event) => {
              list.search.onChange(event.target.value);
            }}
          />
        </div>
        {list.hasFilters && (
          <Button type="button" variant="ghost" onClick={list.clearFilters}>
            {tFilters("clear")}
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        query={notes}
        getRowId={(note) => note.id ?? ""}
        caption={t("caption")}
        errorTitle={t("loadFailed")}
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
    </div>
  );
}
