import { bffPost } from "@/lib/api/bff-fetch";
import { hardNavigate } from "@/lib/hard-navigate";
import { postSessionMessage } from "@/lib/session-channel";

// Signing out in the browser (APP_FLOW 5.9, TRD 5.6): the BFF clears the
// cookies even when identity cannot be reached, other tabs are told, and a
// full page load to sign-in drops every cached query.

export const SIGN_OUT_PATH = "/api/auth/logout";
export const SIGN_OUT_EVERYWHERE_PATH = "/api/auth/logout-all";

export async function signOut(
  options: { everywhere?: boolean; next?: string } = {},
): Promise<void> {
  try {
    await bffPost(
      options.everywhere ? SIGN_OUT_EVERYWHERE_PATH : SIGN_OUT_PATH,
    );
  } catch {
    // The cookies are cleared on any answer; a network failure leaves them,
    // and the next request signs the user out once the session expires.
  }
  postSessionMessage({ type: "signed-out" });
  hardNavigate(
    options.next
      ? `/sign-in?${new URLSearchParams({ next: options.next }).toString()}`
      : "/sign-in",
  );
}
