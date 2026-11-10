import { REQUESTED_WITH } from "@/lib/api/client";
import { signInUrl, SIGN_IN_PATH } from "@/lib/api/query-client";
import type { SessionMessage } from "@/lib/session-channel";

// What a tab does when another tab says the session ended or the user signed
// out (TRD 5.6): nothing until the user acts here (a pointer, a key, or coming
// back to the tab). Then it asks the BFF whether this browser still has a
// session: if not, it drops its cached data and goes to sign-in; if it does
// (the user signed in again elsewhere, maybe as someone else), it reloads.

/** The events that count as the user's next action in this tab. */
export const NEXT_ACTION_EVENTS = ["pointerdown", "keydown", "focus"] as const;

export type SessionStatus = { signed_in: boolean };

export type SessionSyncDeps = {
  subscribe: (handler: (message: SessionMessage) => void) => () => void;
  /** Where the next action is listened for; the window in the browser. */
  target: Pick<Window, "addEventListener" | "removeEventListener">;
  checkSession: () => Promise<SessionStatus | null>;
  clearCache: () => void;
  navigate: (url: string) => void;
  reload: () => void;
  currentPath: () => string;
};

/** The sign-in URL for a message: the reason for an ended session, none for a sign-out. */
export function signInUrlFor(message: SessionMessage, next: string): string {
  return message.type === "ended"
    ? signInUrl(message.reason, next)
    : `${SIGN_IN_PATH}?${new URLSearchParams({ next }).toString()}`;
}

/** Starts watching. Returns the function that stops it. */
export function watchSessionMessages(deps: SessionSyncDeps): () => void {
  let pending: SessionMessage | null = null;
  let acting = false;

  const onAction = () => {
    const message = pending;
    if (!message || acting) {
      return;
    }
    acting = true;
    stopListening();
    void deps
      .checkSession()
      .catch(() => null)
      .then((status) => {
        if (status?.signed_in) {
          deps.reload();
          return;
        }
        deps.clearCache();
        deps.navigate(signInUrlFor(message, deps.currentPath()));
      });
  };

  const stopListening = () => {
    for (const type of NEXT_ACTION_EVENTS) {
      deps.target.removeEventListener(type, onAction, true);
    }
  };

  const unsubscribe = deps.subscribe((message) => {
    if (acting) {
      return;
    }
    // A later "ended" carries a reason; keep it over an earlier sign-out.
    if (pending === null || message.type === "ended") {
      pending = message;
    }
    for (const type of NEXT_ACTION_EVENTS) {
      deps.target.addEventListener(type, onAction, true);
    }
  });

  return () => {
    unsubscribe();
    stopListening();
  };
}

/** Asks `GET /api/session`; `null` when the BFF cannot answer. */
export async function fetchSessionStatus(): Promise<SessionStatus | null> {
  const response = await fetch("/api/session", {
    headers: { "X-Requested-With": REQUESTED_WITH },
    cache: "no-store",
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { data?: SessionStatus };
  return body.data ?? null;
}
