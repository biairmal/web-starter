"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { useCan } from "@/components/auth/can";
import { SEARCH_DEBOUNCE_MS } from "@/components/data-table/use-list-params";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USERS_READ } from "@/lib/authz/permissions";
import {
  ACTION_PREFIXES,
  type ActionPrefix,
  useActorName,
  useActorSearch,
} from "@/features/audit/use-audit";

// The audit log filters in one row (FE-46, DESIGN_BRIEF 7.9): the actor,
// found by a user search; the kind of action; a date range in the viewer's
// time zone. Every value lives in the URL.

const ANY = "any";

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

function ActorFilter({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("audit.filters");
  const canSearch = useCan(USERS_READ);
  const inputId = useId();
  const [draft, setDraft] = useState("");
  const [term, setTerm] = useState("");
  const name = useActorName(value, canSearch);
  const results = useActorSearch(term, canSearch && value === undefined);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTerm(draft);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [draft]);

  if (value !== undefined) {
    return (
      <div className="flex h-9 items-center gap-1 rounded-md border border-border ps-3 pe-1 text-body">
        <span className="text-muted-foreground">{t("actor")}</span>
        <span className="max-w-48 truncate font-medium">
          {name.data ?? t("someone")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("clearActor")}
          onClick={() => {
            setDraft("");
            setTerm("");
            onChange("");
          }}
        >
          <X aria-hidden="true" />
        </Button>
      </div>
    );
  }
  if (!canSearch) {
    return null;
  }

  const items = term ? (results.data?.items ?? []) : [];
  return (
    <div className="relative flex w-full flex-col gap-1 sm:w-60">
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
      {term && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 rounded-md border border-border bg-background p-1 shadow-md">
          {results.isPending ? (
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
          )}
        </div>
      )}
    </div>
  );
}

export function AuditFilters({
  filters,
  onFilterChange,
  onClear,
  hasFilters,
}: {
  filters: Readonly<Record<string, string>>;
  onFilterChange: (key: string, value: string) => void;
  onClear: () => void;
  hasFilters: boolean;
}) {
  const t = useTranslations("audit.filters");
  const actionId = useId();
  const fromId = useId();
  const toId = useId();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <ActorFilter
        value={filters.actor}
        onChange={(id) => {
          onFilterChange("actor", id);
        }}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={actionId} className="text-small text-muted-foreground">
          {t("action")}
        </label>
        <Select
          value={filters.action ?? ANY}
          onValueChange={(value) => {
            onFilterChange("action", value === ANY ? "" : value);
          }}
        >
          <SelectTrigger id={actionId} className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t("anyAction")}</SelectItem>
            {ACTION_PREFIXES.map((prefix) => (
              <SelectItem key={prefix} value={prefix}>
                {t(`actions.${PREFIX_LABELS[prefix]}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={fromId} className="text-small text-muted-foreground">
          {t("from")}
        </label>
        <Input
          id={fromId}
          type="date"
          className="w-40"
          value={filters.from ?? ""}
          max={filters.to}
          onChange={(event) => {
            onFilterChange("from", event.target.value);
          }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={toId} className="text-small text-muted-foreground">
          {t("to")}
        </label>
        <Input
          id={toId}
          type="date"
          className="w-40"
          value={filters.to ?? ""}
          min={filters.from}
          onChange={(event) => {
            onFilterChange("to", event.target.value);
          }}
        />
      </div>
      {hasFilters && (
        <Button type="button" variant="ghost" onClick={onClear}>
          {t("clear")}
        </Button>
      )}
    </div>
  );
}
