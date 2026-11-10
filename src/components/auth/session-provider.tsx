"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect } from "react";
import { api, unwrap } from "@/lib/api/client";
import {
  ME_REFETCH_INTERVAL,
  queryKeys,
  staleTimes,
} from "@/lib/api/query-keys";
import type { Me } from "@/lib/api/types";
import { subscribeSessionMessages } from "@/lib/session-channel";
import { fetchSessionStatus, watchSessionMessages } from "@/lib/session-sync";

// The signed-in user for client components. The (app) layout loads `GET
// /v1/me` on the server and passes it here; the query then keeps it fresh on
// window focus and every 5 minutes, so role changes show without signing out
// (TRD 6.2, 9, FE-23).

const InitialMeContext = createContext<Me | null>(null);

export function SessionProvider({
  me,
  children,
}: {
  me: Me;
  children: React.ReactNode;
}) {
  useSessionSync();
  return <InitialMeContext value={me}>{children}</InitialMeContext>;
}

/**
 * Follows a session end or sign-out in another tab, on this tab's next action
 * (TRD 5.6). Used by every screen that shows signed-in content.
 */
export function useSessionSync(): void {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      watchSessionMessages({
        subscribe: subscribeSessionMessages,
        target: window,
        checkSession: fetchSessionStatus,
        clearCache: () => {
          queryClient.clear();
        },
        navigate: (url) => {
          window.location.assign(url);
        },
        reload: () => {
          window.location.reload();
        },
        currentPath: () =>
          `${window.location.pathname}${window.location.search}`,
      }),
    [queryClient],
  );
}

export function fetchMe(): Promise<Me> {
  return unwrap(api.GET("/me"));
}

/** The current user. Must be used under `SessionProvider`. */
export function useMe(): Me {
  const initial = useContext(InitialMeContext);
  if (initial === null) {
    throw new Error("useMe must be used inside SessionProvider");
  }
  const { data } = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchMe,
    initialData: initial,
    staleTime: staleTimes.me,
    refetchOnWindowFocus: true,
    refetchInterval: ME_REFETCH_INTERVAL,
  });
  return data;
}
