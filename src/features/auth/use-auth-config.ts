"use client";

import { useQuery } from "@tanstack/react-query";
import { bffGet } from "@/lib/api/bff-fetch";
import { queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { AuthConfig } from "@/lib/api/types";

/** Used when identity cannot be reached: password sign-in only, nothing else. */
export const FALLBACK_AUTH_CONFIG: AuthConfig = {
  providers: { password: true, google: false },
  registration: false,
  tenancy: "single",
};

/**
 * What the public screens show (FE-1): enabled sign-in methods, registration
 * and tenancy. The page passes the server's copy as `initial`, so the first
 * render needs no request.
 */
export function useAuthConfig(initial: AuthConfig | null): AuthConfig {
  const query = useQuery({
    queryKey: queryKeys.config,
    queryFn: () => bffGet<AuthConfig>("/api/auth/config"),
    staleTime: staleTimes.config,
    ...(initial ? { initialData: initial } : {}),
  });
  return query.data ?? FALLBACK_AUTH_CONFIG;
}
