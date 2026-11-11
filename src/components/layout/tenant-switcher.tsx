"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useMe } from "@/components/auth/session-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { bffPost } from "@/lib/api/bff-fetch";
import type { NextResult } from "@/lib/api/bff-types";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys, staleTimes } from "@/lib/api/query-keys";
import { useErrorToast } from "@/lib/api/use-error-toast";
import type { Tenancy } from "@/lib/authz/can";
import { hardNavigate } from "@/lib/hard-navigate";
import { postSessionMessage } from "@/lib/session-channel";

// The tenant switcher at the top of the sidebar (APP_FLOW 2, 5.10; TRD 5.8;
// DESIGN_BRIEF 5.2; FE-31). Only in multi mode and only for a user in more
// than one tenant. Picking a tenant replaces the session's cookies, tells the
// other tabs, and loads `/` in full, so nothing from the old tenant stays in
// memory. It opens without animation (DESIGN_BRIEF 4.5).

export const SWITCH_TENANT_PATH = "/api/auth/switch-tenant";

/** `GET /v1/me/tenants`: the tenants the user is an active member of. */
export function useMyTenants(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.meTenants,
    queryFn: () => unwrap(api.GET("/me/tenants")),
    staleTime: staleTimes.meTenants,
    enabled,
  });
}

/**
 * Switches the session to `tenantId` and reloads into it. Resolves once the
 * reload has started; rejects with the `ApiError` identity answered.
 */
export async function switchTenant(tenantId: string): Promise<void> {
  const result = await bffPost<NextResult>(SWITCH_TENANT_PATH, {
    tenant_id: tenantId,
  });
  postSessionMessage({ type: "tenant-switched" });
  hardNavigate(result.next);
}

export function TenantSwitcher({ tenancy }: { tenancy: Tenancy }) {
  const t = useTranslations("shell.tenantSwitcher");
  const me = useMe();
  const queryClient = useQueryClient();
  const showError = useErrorToast();
  const multi = tenancy === "multi";
  const { data: tenants } = useMyTenants(multi);
  const [switching, setSwitching] = useState<string | null>(null);

  if (!multi || !tenants || tenants.length < 2) {
    return null;
  }

  const choose = async (tenantId: string) => {
    if (tenantId === me.tenant.id || switching !== null) {
      return;
    }
    setSwitching(tenantId);
    try {
      await switchTenant(tenantId);
    } catch (error) {
      setSwitching(null);
      showError(error);
      // A suspended tenant or an ended membership: the list is out of date.
      void queryClient.invalidateQueries({ queryKey: queryKeys.meTenants });
    }
  };

  return (
    <div className="px-2 pb-2">
      <DropdownMenu>
        {/* The accessible name keeps the visible tenant name, then says what
            the button opens (WCAG 2.5.3 label in name). */}
        <DropdownMenuTrigger
          disabled={switching !== null}
          aria-busy={switching !== null || undefined}
          className="flex h-nav-row w-full items-center gap-2 rounded-md px-2 text-start hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-wait"
        >
          <span className="min-w-0 flex-1 truncate text-body font-medium">
            {me.tenant.name}
          </span>
          <span className="sr-only">{t("open")}</span>
          {switching === null ? (
            <ChevronsUpDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground"
            />
          ) : (
            <Loader2
              aria-hidden="true"
              className="size-4 shrink-0 animate-spin text-muted-foreground"
            />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="duration-0">
          <DropdownMenuLabel className="text-small text-muted-foreground">
            {t("label")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={me.tenant.id}
            onValueChange={(value) => {
              void choose(value);
            }}
          >
            {tenants.map((tenant) => (
              <DropdownMenuRadioItem key={tenant.id} value={tenant.id}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{tenant.name}</span>
                  <span className="truncate font-mono text-small text-muted-foreground">
                    {tenant.slug}
                  </span>
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
