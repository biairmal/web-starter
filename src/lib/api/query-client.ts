import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { type ApiError, isApiError } from "@/lib/api/errors";
import { postSessionMessage } from "@/lib/session-channel";

// The app's TanStack Query client. A `401 SESSION_ENDED` from any query or
// mutation clears the cache, tells other tabs, and goes to sign-in (TRD 5.6).

export const SIGN_IN_PATH = "/sign-in";

/** Failed queries retry at most this many times, and never on a 4xx. */
const MAX_RETRIES = 2;

export type QueryClientDeps = {
  /** Full navigation, so nothing from the ended session stays in memory. */
  navigate: (url: string) => void;
  /** The path and query string to come back to after signing in. */
  currentPath: () => string;
};

/**
 * The reason shown on sign-in: identity's reason when it gave one, otherwise
 * SESSION_ENDED (the BFF found no usable session).
 */
export function sessionEndReason(error: ApiError): string {
  const cause = error.sessionEndCause;
  return cause !== undefined && cause !== "NO_SESSION"
    ? cause
    : "SESSION_ENDED";
}

export function signInUrl(reason: string, next: string): string {
  const params = new URLSearchParams({ reason, next });
  return `${SIGN_IN_PATH}?${params.toString()}`;
}

export function createQueryClient(deps: QueryClientDeps): QueryClient {
  let ending = false;

  const onError = (error: unknown) => {
    if (!isApiError(error) || !error.isSessionEnded || ending) {
      return;
    }
    ending = true;
    const reason = sessionEndReason(error);
    client.clear();
    postSessionMessage({ type: "ended", reason });
    deps.navigate(signInUrl(reason, deps.currentPath()));
  };

  const client: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status < 500) &&
          failureCount < MAX_RETRIES,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
  return client;
}
