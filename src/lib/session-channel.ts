// Tells other tabs that the session ended, the user signed out (TRD 5.6), or
// the session moved to another tenant (TRD 5.8). Tabs share cookies, so they
// share the session; each tab acts on the message on its next action: a tab
// still signed in reloads, so it shows the new tenant's data.

export const SESSION_CHANNEL_NAME = "session";

export type SessionMessage =
  | { type: "ended"; reason: string }
  | { type: "signed-out" }
  | { type: "tenant-switched" };

function isSessionMessage(value: unknown): value is SessionMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  return (
    value.type === "signed-out" ||
    value.type === "tenant-switched" ||
    (value.type === "ended" &&
      "reason" in value &&
      typeof value.reason === "string")
  );
}

/** Posts to every other tab. Does nothing where BroadcastChannel is missing. */
export function postSessionMessage(message: SessionMessage): void {
  if (typeof BroadcastChannel === "undefined") {
    return;
  }
  const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
  channel.postMessage(message);
  channel.close();
}

/** Calls `handler` for each message from another tab. Returns the unsubscribe. */
export function subscribeSessionMessages(
  handler: (message: SessionMessage) => void,
): () => void {
  if (typeof BroadcastChannel === "undefined") {
    return () => undefined;
  }
  const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    if (isSessionMessage(event.data)) {
      handler(event.data);
    }
  };
  return () => {
    channel.close();
  };
}
