"use server";

import { cookies } from "next/headers";
import { env } from "@/config/env";
import {
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localeCookieName,
} from "@/i18n/config";

/**
 * Stores the chosen locale in the locale cookie (TRD 5.1: SameSite=Lax,
 * readable by JS, one year). An unsupported value is ignored.
 */
export async function setLocale(locale: unknown): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }
  (await cookies()).set(localeCookieName(env.SESSION_COOKIE_PREFIX), locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: new URL(env.APP_URL).protocol === "https:",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
}
