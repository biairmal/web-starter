"use client";

import { useQuery } from "@tanstack/react-query";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";
import { bffGet } from "@/lib/api/bff-fetch";
import { queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { AuthConfig } from "@/lib/api/types";

export type PasswordLength = { min: number; max: number };

/**
 * The lengths identity enforces (FE-4). `password` is optional here because
 * identity builds older than the lengths in `/v1/auth/config` leave it out;
 * the local constants apply then.
 */
export function passwordLength(
  config: { password?: AuthConfig["password"] } | undefined,
): PasswordLength {
  return {
    min: config?.password?.min_length ?? PASSWORD_MIN_LENGTH,
    max: config?.password?.max_length ?? PASSWORD_MAX_LENGTH,
  };
}

/** Shares the auth config query, so a page that already has it fetches nothing. */
export function usePasswordLength(): PasswordLength {
  const query = useQuery({
    queryKey: queryKeys.config,
    queryFn: () => bffGet<AuthConfig>("/api/auth/config"),
    staleTime: staleTimes.config,
  });
  return passwordLength(query.data);
}
