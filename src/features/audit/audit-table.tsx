"use client";

import { ChevronDown, RefreshCw, ScrollText, SearchX } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Fragment, useState, useSyncExternalStore } from "react";
import { Pagination } from "@/components/data-table/pagination";
import { useListParams } from "@/components/data-table/use-list-params";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { Button } from "@/components/ui/button";
import type { AuditEntry } from "@/lib/api/types";
import type en from "../../../messages/en.json";
import { cn } from "@/lib/utils";
import { AuditDiff } from "@/features/audit/audit-diff";
import { AuditFilters } from "@/features/audit/audit-filters";
import { AUDIT_FILTERS, useAudit } from "@/features/audit/use-audit";

// The audit log (FE-46, APP_FLOW 7, DESIGN_BRIEF 7.9): "Who changed that, and
// what did it look like before?" Newest first. Each row states when (in the
// viewer's time zone, UTC on hover), who, what in words and on what; it
// expands to the before/after view. No polling: a Refresh button and the
// time the page was loaded.

type ActionKey = keyof (typeof en)["audit"]["actions"];

const LIST_CONFIG = { filters: AUDIT_FILTERS } as const;
const NOW_REFRESH_MS = 60_000;
const SKELETON_ROWS = 6;

/** Actions with a phrase in `audit.actions`; others show their raw name. */
const KNOWN_ACTIONS = new Set([
  "auth.email_verified",
  "auth.login",
  "auth.login_failed",
  "auth.logout",
  "auth.logout_all",
  "auth.password_change",
  "auth.password_reset",
  "auth.refresh_reuse",
  "auth.register",
  "auth.tenant_switch",
  "auth.token_refresh",
  "identity.link",
  "identity.unlink",
  "member.add",
  "member.remove",
  "role.create",
  "role.delete",
  "role.permissions",
  "role.update",
  "role_template.create",
  "role_template.delete",
  "role_template.update",
  "session.revoke",
  "session.revoke_all",
  "superadmin.create",
  "superadmin.reset",
  "superadmin.transfer",
  "tenant.create",
  "tenant.reactivate",
  "tenant.suspend",
  "tenant.update",
  "user.create",
  "user.delete",
  "user.disable",
  "user.enable",
  "user.invite",
  "user.invite_accepted",
  "user.roles_assigned",
]);

function utc(at: string): string {
  return new Date(at)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC");
}

const noSubscription = () => () => undefined;

/**
 * The viewer's time zone. The server renders in UTC (see src/i18n), so the
 * zone is read in the browser only, after hydration.
 */
function useViewerTimeZone(): string | undefined {
  return useSyncExternalStore(
    noSubscription,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => undefined,
  );
}

function When({ at }: { at: string }) {
  const format = useFormatter();
  const now = useNow({ updateInterval: NOW_REFRESH_MS });
  const timeZone = useViewerTimeZone();
  const date = new Date(at);
  return (
    <time dateTime={at} title={utc(at)} className="flex flex-col">
      <span className="tabular-nums">
        {format.dateTime(date, {
          dateStyle: "medium",
          timeStyle: "short",
          ...(timeZone ? { timeZone } : {}),
        })}
      </span>
      <span className="text-small text-muted-foreground">
        {format.relativeTime(date, now)}
      </span>
    </time>
  );
}

function useDescribe() {
  const t = useTranslations("audit");
  return {
    action: (entry: AuditEntry) =>
      KNOWN_ACTIONS.has(entry.action)
        ? t(`actions.${entry.action.replace(".", "_") as ActionKey}`)
        : entry.action,
    actor: (entry: AuditEntry) =>
      entry.actor?.display_name ??
      (entry.actor?.id ? t("table.unknownActor") : t("table.anonymous")),
    target: (entry: AuditEntry) =>
      entry.target_type
        ? `${entry.target_type}${entry.target_id ? ` ${entry.target_id.slice(0, 8)}` : ""}`
        : "",
  };
}

function Row({ entry }: { entry: AuditEntry }) {
  const t = useTranslations("audit.table");
  const describe = useDescribe();
  const [open, setOpen] = useState(false);
  const detailId = `audit-${String(entry.id)}`;
  const action = describe.action(entry);
  return (
    <Fragment>
      <tr className="h-14 border-t border-rule hover:bg-raised">
        <td className="px-3 ps-0">
          <When at={entry.at} />
        </td>
        <td className="px-3">{describe.actor(entry)}</td>
        <td className="px-3">
          <span className="flex flex-col">
            <span>{action}</span>
            <code className="font-mono text-small text-faint">
              {entry.action}
            </code>
          </span>
        </td>
        <td className="px-3 font-mono text-small text-muted-foreground">
          {describe.target(entry)}
        </td>
        <td className="px-3 pe-0 text-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-expanded={open}
            aria-controls={detailId}
            aria-label={t(open ? "collapse" : "expand", { action })}
            onClick={() => {
              setOpen(!open);
            }}
          >
            <ChevronDown
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </Button>
        </td>
      </tr>
      {open && (
        <tr id={detailId} className="bg-raised">
          <td colSpan={5} className="px-3 py-3">
            <AuditDiff before={entry.before} after={entry.after} />
            {(entry.ip ?? entry.request_id) && (
              <p className="mt-2 font-mono text-small text-faint">
                {[
                  entry.ip ? t("ip", { ip: entry.ip }) : undefined,
                  entry.request_id
                    ? t("requestId", { id: entry.request_id })
                    : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function Card({ entry }: { entry: AuditEntry }) {
  const t = useTranslations("audit.table");
  const describe = useDescribe();
  const [open, setOpen] = useState(false);
  const action = describe.action(entry);
  const detailId = `audit-card-${String(entry.id)}`;
  return (
    <li className="flex flex-col gap-2 border-b border-rule py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium">{action}</span>
          <span className="truncate text-small text-muted-foreground">
            {[describe.actor(entry), describe.target(entry)]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="text-small text-muted-foreground">
            <When at={entry.at} />
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-expanded={open}
          aria-controls={detailId}
          aria-label={t(open ? "collapse" : "expand", { action })}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn("transition-transform", open && "rotate-180")}
          />
        </Button>
      </div>
      {open && (
        <div id={detailId}>
          <AuditDiff before={entry.before} after={entry.after} />
        </div>
      )}
    </li>
  );
}

export function AuditTable() {
  const t = useTranslations("audit.table");
  const format = useFormatter();
  const list = useListParams(LIST_CONFIG);
  const audit = useAudit(list.params);
  const entries = audit.data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AuditFilters
          filters={list.params.filters}
          onFilterChange={(key, value) => {
            list.setFilter(key, value);
          }}
          onClear={list.clearFilters}
          hasFilters={list.hasFilters}
        />
        <div className="flex items-center gap-3">
          <p aria-live="polite" className="text-small text-muted-foreground">
            {audit.dataUpdatedAt > 0 &&
              t("updated", {
                time: format.dateTime(new Date(audit.dataUpdatedAt), {
                  timeStyle: "medium",
                }),
              })}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={audit.isFetching}
            aria-busy={audit.isFetching || undefined}
            onClick={() => {
              void audit.refetch();
            }}
          >
            <RefreshCw
              aria-hidden="true"
              className={cn(audit.isFetching && "animate-spin")}
            />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {audit.isError ? (
        <ErrorState
          title={t("loadFailed")}
          error={audit.error}
          retrying={audit.isFetching}
          onRetry={() => {
            void audit.refetch();
          }}
        />
      ) : audit.isPending ? (
        <div role="status" className="flex flex-col">
          <span className="sr-only">{t("loading")}</span>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div
              key={index}
              className="flex h-14 items-center gap-6 border-t border-rule"
            >
              <SkeletonBar className="w-32" />
              <SkeletonBar className="w-24" />
              <SkeletonBar className="w-40" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        list.hasFilters ? (
          <EmptyState
            icon={SearchX}
            title={t("noMatch")}
            action={
              <Button variant="outline" onClick={list.clearFilters}>
                {t("clearFilters")}
              </Button>
            }
          />
        ) : (
          <EmptyState icon={ScrollText} title={t("empty")} />
        )
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-body">
              <caption className="sr-only">{t("caption")}</caption>
              <thead>
                <tr className="text-small text-muted-foreground">
                  <th
                    scope="col"
                    className="h-9 px-3 ps-0 text-start font-normal"
                  >
                    {t("when")}
                  </th>
                  <th scope="col" className="h-9 px-3 text-start font-normal">
                    {t("actor")}
                  </th>
                  <th scope="col" className="h-9 px-3 text-start font-normal">
                    {t("action")}
                  </th>
                  <th scope="col" className="h-9 px-3 text-start font-normal">
                    {t("target")}
                  </th>
                  <th
                    scope="col"
                    className="h-9 px-3 pe-0 text-end font-normal"
                  >
                    <span className="sr-only">{t("details")}</span>
                  </th>
                </tr>
              </thead>
              <tbody aria-busy={audit.isFetching || undefined}>
                {entries.map((entry) => (
                  <Row key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
          <ul aria-label={t("caption")} className="sm:hidden">
            {entries.map((entry) => (
              <Card key={entry.id} entry={entry} />
            ))}
          </ul>
          <Pagination
            page={audit.data}
            onPageChange={list.setPage}
            onSizeChange={list.setSize}
          />
        </>
      )}
    </div>
  );
}
