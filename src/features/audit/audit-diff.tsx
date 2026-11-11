"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// The before/after view of an audit entry (FE-46, DESIGN_BRIEF 7.9): one row
// per field, never one raw JSON blob. Changed fields read in the text colour,
// unchanged ones faint; a removed value has the negative tint and an added
// one the positive tint.

type Snapshot = Record<string, unknown> | undefined;

export type FieldChange = {
  field: string;
  before: unknown;
  after: unknown;
  kind: "added" | "removed" | "changed" | "same";
};

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Every field of either side, in alphabetical order, with what happened to it. */
export function diffSnapshots(
  before: Snapshot,
  after: Snapshot,
): FieldChange[] {
  const fields = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ].sort();
  return fields.map((field) => {
    const inBefore = before !== undefined && Object.hasOwn(before, field);
    const inAfter = after !== undefined && Object.hasOwn(after, field);
    const b = inBefore ? before[field] : undefined;
    const a = inAfter ? after[field] : undefined;
    const kind = !inBefore
      ? "added"
      : !inAfter
        ? "removed"
        : same(b, a)
          ? "same"
          : "changed";
    return { field, before: b, after: a, kind };
  });
}

export function formatValue(value: unknown): string {
  if (value === undefined) {
    return "";
  }
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function AuditDiff({
  before,
  after,
}: {
  before: Snapshot;
  after: Snapshot;
}) {
  const t = useTranslations("audit.diff");
  const rows = diffSnapshots(before, after);

  if (rows.length === 0) {
    return <p className="text-body text-muted-foreground">{t("none")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-small">
        <caption className="sr-only">{t("caption")}</caption>
        <thead>
          <tr className="text-muted-foreground">
            <th scope="col" className="w-1/5 py-1 pe-3 text-start font-normal">
              {t("field")}
            </th>
            <th scope="col" className="w-2/5 py-1 pe-3 text-start font-normal">
              {t("before")}
            </th>
            <th scope="col" className="w-2/5 py-1 text-start font-normal">
              {t("after")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.field}
              className={cn(
                "align-top",
                row.kind === "same" ? "text-faint" : "text-foreground",
              )}
            >
              <th scope="row" className="py-1 pe-3 text-start font-normal">
                {row.field}
                {row.kind !== "same" && (
                  <span className="sr-only">{t(`kinds.${row.kind}`)}</span>
                )}
              </th>
              <td className="py-1 pe-3 break-all">
                <span
                  className={cn(
                    row.kind === "removed" || row.kind === "changed"
                      ? "rounded-sm bg-pill-negative px-1 text-pill-negative-ink"
                      : undefined,
                  )}
                >
                  {formatValue(row.before)}
                </span>
              </td>
              <td className="py-1 break-all">
                <span
                  className={cn(
                    row.kind === "added" || row.kind === "changed"
                      ? "rounded-sm bg-pill-positive px-1 text-pill-positive-ink"
                      : undefined,
                  )}
                >
                  {formatValue(row.after)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
