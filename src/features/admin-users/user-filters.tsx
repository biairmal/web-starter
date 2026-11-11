"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleSummary } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_STATUSES,
  MEMBERSHIP_STATUSES,
} from "@/features/admin-users/use-users";

// The users toolbar (FE-40, DESIGN_BRIEF 7.7): membership tabs, search by
// name or exact email, account status and role. Every value lives in the URL
// through useListParams; the parent passes it in.

/** Radix Select has no empty value, so "any" stands for no filter. */
const ANY = "any";

export type UserFilterValues = Readonly<Record<string, string>>;

export function UserFilters({
  filters,
  search,
  onSearchChange,
  onFilterChange,
  onClear,
  hasFilters,
  roles,
}: {
  filters: UserFilterValues;
  search: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string) => void;
  onClear: () => void;
  hasFilters: boolean;
  /** The role options; undefined hides the role filter. */
  roles: readonly Pick<RoleSummary, "id" | "name">[] | undefined;
}) {
  const t = useTranslations("adminUsers.filters");
  const searchId = useId();
  const statusId = useId();
  const roleId = useId();
  const membership = filters.membership_status ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-label={t("membership")}
        className="flex gap-4 overflow-x-auto border-b border-rule"
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
                "-mb-px h-9 shrink-0 border-b-2 text-body focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`tabs.${value || "all"}`)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-72">
          <label htmlFor={searchId} className="sr-only">
            {t("search")}
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={search}
            placeholder={t("search")}
            autoComplete="off"
            spellCheck={false}
            className="ps-8"
            onChange={(event) => {
              onSearchChange(event.target.value);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={statusId} className="sr-only">
            {t("status")}
          </label>
          <Select
            value={filters.status ?? ANY}
            onValueChange={(value) => {
              onFilterChange("status", value === ANY ? "" : value);
            }}
          >
            <SelectTrigger id={statusId} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("anyStatus")}</SelectItem>
              {ACCOUNT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`statuses.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {roles && (
          <div className="flex items-center gap-2">
            <label htmlFor={roleId} className="sr-only">
              {t("role")}
            </label>
            <Select
              value={filters.role ?? ANY}
              onValueChange={(value) => {
                onFilterChange("role", value === ANY ? "" : value);
              }}
            >
              <SelectTrigger id={roleId} className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>{t("anyRole")}</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={onClear}>
            {t("clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
