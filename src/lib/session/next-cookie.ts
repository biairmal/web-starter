import "server-only";

import { z } from "zod";
import { env } from "@/config/env";
import { safeNext } from "@/lib/bff/next-path";
import type { CookieReader, CookieSpec } from "@/lib/session/cookies";
import { seal, unseal } from "@/lib/session/crypto";

// Where to return after a Google round trip (TRD 5.5, 8.1): the path, and the
// tenant slug the user typed, so a TENANT_REQUIRED answer can keep it. Sealed
// like the session cookies, so the browser can neither read nor change it.
// SameSite=Lax, because identity sends the browser back with a top-level GET.

const NEXT_COOKIE_SECONDS = 10 * 60;

const nextCookieSchema = z.object({
  path: z.string(),
  tenant: z.string().optional(),
});

export type NextCookie = z.infer<typeof nextCookieSchema>;

export function nextCookieName(
  prefix: string = env.SESSION_COOKIE_PREFIX,
): string {
  return `__Host-${prefix}_next`;
}

export async function sealNextCookie(value: NextCookie): Promise<CookieSpec> {
  return {
    name: nextCookieName(),
    value: await seal({
      path: safeNext(value.path),
      ...(value.tenant === undefined ? {} : { tenant: value.tenant }),
    }),
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: NEXT_COOKIE_SECONDS,
    },
  };
}

export function clearedNextCookie(): CookieSpec {
  return {
    name: nextCookieName(),
    value: "",
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

/** The saved return, or `null` when missing, expired or tampered with. */
export async function readNextCookie(
  reader: CookieReader,
): Promise<NextCookie | null> {
  const raw = reader.get(nextCookieName())?.value;
  if (!raw) {
    return null;
  }
  const result = nextCookieSchema.safeParse(await unseal(raw));
  if (!result.success) {
    return null;
  }
  return {
    path: safeNext(result.data.path),
    ...(result.data.tenant === undefined ? {} : { tenant: result.data.tenant }),
  };
}
