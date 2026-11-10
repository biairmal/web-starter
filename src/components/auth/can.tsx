"use client";

import { useMe } from "@/components/auth/session-provider";
import { can } from "@/lib/authz/can";

/** Whether the signed-in user holds `key` (TRD 9). UI only; identity decides. */
export function useCan(key: string): boolean {
  return can(useMe(), key);
}

/** Renders `children` only for a user who holds `permission`. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return useCan(permission) ? children : fallback;
}
