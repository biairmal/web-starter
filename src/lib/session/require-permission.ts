import "server-only";

import { headers } from "next/headers";
import { forbidden, notFound, redirect } from "next/navigation";
import type { Me } from "@/lib/api/types";
import { safeNext } from "@/lib/bff/next-path";
import { can } from "@/lib/authz/can";
import { getAuthConfig, getCurrentMe } from "@/lib/session/me";
import {
  REQUEST_PATH_HEADER,
  SESSION_CHECK_PATH,
} from "@/lib/session/route-rules";

// Server-side gates for signed-in pages (TRD 6.2).

/**
 * Sends the browser to the session check, which refreshes the session if it
 * can and otherwise clears the cookies and goes to sign-in.
 */
async function toSessionCheck(): Promise<never> {
  const next = safeNext((await headers()).get(REQUEST_PATH_HEADER));
  redirect(`${SESSION_CHECK_PATH}?${new URLSearchParams({ next }).toString()}`);
}

/** The signed-in user, or a redirect away when identity rejects the session. */
export async function requireMe(): Promise<Me> {
  const me = await getCurrentMe();
  return me ?? toSessionCheck();
}

/**
 * The signed-in super admin, for the multi-mode platform pages (TRD 6.1,
 * 6.2). In single mode the page does not exist (404); for anyone else it is
 * the forbidden state with status 403.
 */
export async function requireSuperAdmin(): Promise<Me> {
  const [me, config] = await Promise.all([requireMe(), getAuthConfig()]);
  if (config?.tenancy !== "multi") {
    notFound();
  }
  if (!me.is_super_admin) {
    forbidden();
  }
  return me;
}

/**
 * The signed-in user, when they hold `key` (or are the super admin). Without
 * it the page renders the forbidden state with status 403, inside the shell.
 */
export async function requirePermission(key: string): Promise<Me> {
  const me = await requireMe();
  if (!can(me, key)) {
    forbidden();
  }
  return me;
}
