"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { useCan } from "@/components/auth/can";
import { SEARCH_DEBOUNCE_MS } from "@/components/data-table/use-list-params";
import { FilterBar } from "@/components/filters/filter-bar";
import type { FilterDef } from "@/components/filters/filters";
import { Input } from "@/components/ui/input";
import { USERS_READ } from "@/lib/authz/permissions";
import {
  ACTION_PREFIXES,
  type ActionPrefix,
  useActorName,
  useActorSearch,
} from "@/features/audit/use-audit";

// The audit log filters (FE-46, DESIGN_BRIEF 7.9) on the shared filter bar:
// the actor, found by a user search; the kind of action; a From and a To date
// in the viewer's time zone. Every value lives in the URL.

/** The filter label of each prefix, under `audit.filters.actions`. */
const PREFIX_LABELS = {
  "auth.": "auth",
  "identity.": "identity",
  "member.": "member",
  "role.": "role",
  "role_template.": "role_template",
  "session.": "session",
  "superadmin.": "superadmin",
  "tenant.": "tenant",
  "user.": "user",
} as const satisfies Record<ActionPrefix, string>;

/** What the actor pill shows: the person's name, looked up from the id. */
function ActorName({ id, canSearch }: { id: string; canSearch: boolean }) {
  const t = useTranslations("audit.filters");
  const name = useActorName(id, canSearch);
  return <>{name.data ?? t("someone")}</>;
}

/** The actor picker shown in the filter panel: a search, then its results. */
function ActorEditor({ onChange }: { onChange: (id: string) => void }) {
  const t = useTranslations("audit.filters");
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [term, setTerm] = useState("");
  const results = useActorSearch(term, true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft]);

  const items = term ? (results.data?.items ?? []) : [];
  return (
    <div className="flex flex-col gap-1 p-1">
      <label htmlFor={inputId} className="text-small text-muted-foreground">
        {t("actor")}
      </label>
      <Input
        id={inputId}
        type="search"
        value={draft}
        placeholder={t("actorSearch")}
        autoComplete="off"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
      {term &&
        (results.isPending ? (
          <p className="px-2 py-1.5 text-small text-muted-foreground">
            {t("searching")}
          </p>
        ) : items.length === 0 ? (
          <p className="px-2 py-1.5 text-small text-muted-foreground">
            {t("noActors")}
          </p>
        ) : (
          <ul aria-label={t("actorResults")}>
            {items.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  className="flex w-full flex-col rounded-sm px-2 py-1.5 text-start hover:bg-raised focus-visible:bg-raised focus-visible:outline-none"
                  onClick={() => {
                    onChange(user.id);
                  }}
                >
                  <span className="text-body">
                    {user.display_name || user.email}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {user.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

export function AuditFilters({
  filters,
  onFilterChange,
  onClear,
}: {
  filters: Readonly<Record<string, string>>;
  onFilterChange: (key: string, value: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations("audit.filters");
  const canSearch = useCan(USERS_READ);

  const defs: FilterDef[] = [
    // Without users:read there is no way to pick a person, but one restored
    // from the URL stays visible and removable.
    ...(canSearch || filters.actor
      ? [
          {
            key: "actor",
            label: t("actor"),
            type: "custom" as const,
            renderValue: (id: string) => (
              <ActorName id={id} canSearch={canSearch} />
            ),
            renderEditor: ({ onChange }: { onChange: (id: string) => void }) =>
              canSearch ? <ActorEditor onChange={onChange} /> : null,
          },
        ]
      : []),
    {
      key: "action",
      label: t("action"),
      type: "select",
      options: ACTION_PREFIXES.map((prefix) => ({
        value: prefix,
        label: t(`actions.${PREFIX_LABELS[prefix]}`),
      })),
    },
    {
      key: "from",
      label: t("from"),
      type: "date",
      ...(filters.to ? { max: filters.to } : {}),
    },
    {
      key: "to",
      label: t("to"),
      type: "date",
      ...(filters.from ? { min: filters.from } : {}),
    },
  ];

  return (
    <FilterBar
      filters={defs}
      values={filters}
      onChange={onFilterChange}
      onClear={onClear}
    />
  );
}
