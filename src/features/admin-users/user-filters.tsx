"use client";

import { useTranslations } from "next-intl";
import { FilterBar } from "@/components/filters/filter-bar";
import type { FilterDef } from "@/components/filters/filters";
import type { RoleSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_STATUSES,
  MEMBERSHIP_STATUSES,
} from "@/features/admin-users/use-users";

// The users toolbar (FE-40, DESIGN_BRIEF 7.7): membership tabs, then the
// shared filter bar with search by name or exact email, account status and
// role. Every value lives in the URL through useListParams; the parent passes
// it in.

export type UserFilterValues = Readonly<Record<string, string>>;

export function UserFilters({
  filters,
  search,
  onSearchChange,
  onFilterChange,
  onClear,
  roles,
}: {
  filters: UserFilterValues;
  search: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  onClear: () => void;
  /** The role options; undefined hides the role filter. */
  roles: readonly Pick<RoleSummary, "id" | "name">[] | undefined;
}) {
  const t = useTranslations("adminUsers.filters");
  const membership = filters.membership_status ?? "";

  const defs: FilterDef[] = [
    {
      key: "status",
      label: t("status"),
      type: "select",
      options: ACCOUNT_STATUSES.map((status) => ({
        value: status,
        label: t(`statuses.${status}`),
      })),
    },
    ...(roles
      ? [
          {
            key: "role",
            label: t("role"),
            type: "select" as const,
            options: roles.map((role) => ({
              value: role.id,
              label: role.name,
            })),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label={t("membership")}
        // overflow-x-auto makes the other axis auto too, so nothing may stick
        // out of the box: the rule below the tabs is an inset shadow, not a
        // border the tabs overlap, which showed a vertical scrollbar.
        className="flex gap-4 overflow-x-auto overflow-y-hidden shadow-rule-inset"
      >
        {(["", ...MEMBERSHIP_STATUSES] as const).map((value) => {
          const active = membership === value;
          return (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onFilterChange("membership_status", value);
              }}
              className={cn(
                "h-9 shrink-0 border-b-2 text-body focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
                active
                  ? "border-brand-accent font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`tabs.${value || "all"}`)}
            </button>
          );
        })}
      </div>
      <FilterBar
        search={{
          value: search,
          onChange: onSearchChange,
          label: t("search"),
        }}
        filters={defs}
        values={filters}
        onChange={onFilterChange}
        onClear={onClear}
      />
    </div>
  );
}
