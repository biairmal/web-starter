"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { api, unwrap } from "@/lib/api/client";
import {
  ME_REFETCH_INTERVAL,
  queryKeys,
  staleTimes,
} from "@/lib/api/query-keys";
import type { Me } from "@/lib/api/types";

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
  return <InitialMeContext value={me}>{children}</InitialMeContext>;
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
