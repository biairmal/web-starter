"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { RoleSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// A multi-select of the tenant's roles as a checkbox list (FE-41, FE-42): a
// real fieldset, so a screen reader announces the group and each role. A role
// the admin may not assign stays visible and disabled, with the reason as its
// description, where pointer and keyboard users both read it.

export function RoleChecklist({
  legend,
  roles,
  value,
  onChange,
  disabledReason,
  invalid = false,
  describedBy,
  className,
}: {
  legend: React.ReactNode;
  roles: readonly Pick<RoleSummary, "id" | "name" | "description">[];
  value: readonly string[];
  onChange: (ids: string[]) => void;
  /** Why a role cannot be ticked, or undefined when it can. */
  disabledReason?: (
    role: Pick<RoleSummary, "id" | "name">,
  ) => string | undefined;
  invalid?: boolean;
  describedBy?: string | undefined;
  className?: string;
}) {
  const t = useTranslations("adminUsers.roles");
  const id = useId();
  const selected = new Set(value);

  const toggle = (roleId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(roleId);
    } else {
      next.delete(roleId);
    }
    // Keep the order of the role list, so the request is stable.
    onChange(roles.map((role) => role.id).filter((entry) => next.has(entry)));
  };

  return (
    <fieldset
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn("flex min-w-0 flex-col gap-2", className)}
    >
      <legend className="mb-2 text-body font-medium">{legend}</legend>
      {roles.length === 0 ? (
        <p className="text-body text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-md border border-border p-2">
          {roles.map((role) => {
            const reason = disabledReason?.(role);
            const inputId = `${id}-${role.id}`;
            const reasonId = reason ? `${inputId}-reason` : undefined;
            const row = (
              <div className="flex min-h-9 items-start gap-3 rounded-sm px-1 py-1.5">
                <Checkbox
                  id={inputId}
                  checked={selected.has(role.id)}
                  disabled={reason !== undefined}
                  aria-describedby={reasonId}
                  onCheckedChange={(checked) => {
                    toggle(role.id, checked === true);
                  }}
                  className="mt-0.5"
                />
                <div className="flex min-w-0 flex-col">
                  <label
                    htmlFor={inputId}
                    className={cn(
                      "text-body",
                      reason !== undefined && "text-muted-foreground",
                    )}
                  >
                    {role.name}
                  </label>
                  {reason ? (
                    <span
                      id={reasonId}
                      className="text-small text-muted-foreground"
                    >
                      {reason}
                    </span>
                  ) : (
                    role.description && (
                      <span className="truncate text-small text-muted-foreground">
                        {role.description}
                      </span>
                    )
                  )}
                </div>
              </div>
            );
            return <li key={role.id}>{row}</li>;
          })}
        </ul>
      )}
    </fieldset>
  );
}
