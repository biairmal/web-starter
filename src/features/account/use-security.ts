"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { queryKeys, staleTimes } from "@/lib/api/query-keys";
import type { Session } from "@/lib/api/types";

// Data for the security page (FE-22, FE-33; TRD 8.4): the user's sessions,
// revoking one, and unlinking Google.

/** `GET /v1/me/sessions`: one entry per device, never cached as fresh. */
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.meSessions,
    queryFn: () => unwrap(api.GET("/me/sessions")),
    staleTime: staleTimes.meSessions,
  });
}

/** `DELETE /v1/me/sessions/{id}`: signs that device out. */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (session: Pick<Session, "id">) =>
      unwrap(
        api.DELETE("/me/sessions/{id}", {
          params: { path: { id: session.id } },
        }),
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.meSessions }),
  });
}

/**
 * `DELETE /v1/me/identities/google`. Identity refuses with
 * LAST_SIGN_IN_METHOD when Google is the only way left to sign in.
 */
export function useUnlinkGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE("/me/identities/google")),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}
