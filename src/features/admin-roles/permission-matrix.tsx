"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PermissionGroup } from "@/features/admin-roles/group-permissions";

// The permission matrix of the role editor (FE-44, FE-47; DESIGN_BRIEF 6.4):
// one fieldset per resource with a tri-state "all in group" checkbox, then a
// row per permission with its description and key. A permission the admin may
// not grant stays legible but disabled, with the reason in a tooltip and as
// the row's description. Every checkbox is in DOM order: Tab moves, Space
// toggles.

export function PermissionMatrix({
  groups,
  selected,
  onChange,
  disabledReason,
  readOnly = false,
}: {
  groups: readonly PermissionGroup[];
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** Why a key cannot be ticked, or undefined when it can. */
  disabledReason: (key: string) => string | undefined;
  readOnly?: boolean;
}) {
  const t = useTranslations("adminRoles.matrix");
  const id = useId();

  const set = (keys: readonly string[], on: boolean) => {
    const next = new Set(selected);
    for (const key of keys) {
      if (on) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    onChange(next);
  };

  // The only tooltips in the app, so their provider lives here rather than in
  // the root providers, which every page (sign-in included) loads.
  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        {groups.map((group) => {
          const keys = group.items.map((item) => item.key);
          const count = keys.filter((key) => selected.has(key)).length;
          const editable = readOnly
            ? []
            : keys.filter((key) => disabledReason(key) === undefined);
          const allOn =
            editable.length > 0 && editable.every((key) => selected.has(key));
          const groupId = `${id}-${group.resource}`;
          return (
            <fieldset
              key={group.resource}
              className="flex min-w-0 flex-col gap-1"
              aria-describedby={`${groupId}-count`}
            >
              <legend className="sr-only">{group.resource}</legend>
              <div className="mb-1 flex items-center gap-3 border-b border-rule pb-2">
                <Checkbox
                  id={`${groupId}-all`}
                  checked={
                    count === 0
                      ? false
                      : count === keys.length
                        ? true
                        : "indeterminate"
                  }
                  disabled={editable.length === 0}
                  aria-label={t("selectGroup", { resource: group.resource })}
                  onCheckedChange={() => {
                    set(editable, !allOn);
                  }}
                />
                <span
                  aria-hidden="true"
                  className="text-section font-semibold capitalize"
                >
                  {group.resource}
                </span>
                <span
                  id={`${groupId}-count`}
                  className="ms-auto text-small text-muted-foreground tabular-nums"
                >
                  {t("groupCount", { count, total: keys.length })}
                </span>
              </div>
              <ul className="flex flex-col">
                {group.items.map((permission) => {
                  const reason = readOnly
                    ? undefined
                    : disabledReason(permission.key);
                  const inputId = `${groupId}-${permission.key}`;
                  const reasonId = reason ? `${inputId}-reason` : undefined;
                  const box = (
                    <Checkbox
                      id={inputId}
                      checked={selected.has(permission.key)}
                      disabled={readOnly || reason !== undefined}
                      aria-describedby={reasonId}
                      onCheckedChange={(checked) => {
                        set([permission.key], checked === true);
                      }}
                      className="mt-0.5"
                    />
                  );
                  return (
                    <li
                      key={permission.key}
                      className="flex min-h-9 items-start gap-3 py-1.5"
                    >
                      {reason ? (
                        <Tooltip>
                          {/* A disabled control gets no pointer events, so the tooltip hangs on its wrapper. */}
                          <TooltipTrigger asChild>
                            <span className="inline-flex">{box}</span>
                          </TooltipTrigger>
                          <TooltipContent>{reason}</TooltipContent>
                        </Tooltip>
                      ) : (
                        box
                      )}
                      <div className="flex min-w-0 flex-col">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <label
                            htmlFor={inputId}
                            className={cn(
                              "text-body",
                              reason !== undefined && "text-muted-foreground",
                            )}
                          >
                            {permission.description}
                          </label>
                          <code className="font-mono text-small text-faint">
                            {permission.key}
                          </code>
                        </span>
                        {reason && (
                          <span
                            id={reasonId}
                            className="text-small text-muted-foreground"
                          >
                            {reason}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
