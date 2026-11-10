import "server-only";

import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { env } from "@/config/env";
import {
  type AppLocale,
  SERVER_TIME_ZONE,
  localeCookieName,
  resolveLocale,
} from "@/i18n/config";
import type en from "../../messages/en.json";

// next-intl's per-request configuration. The locale is not in the URL (TRD
// decision 7): it comes from the locale cookie, then Accept-Language, then
// NEXT_PUBLIC_DEFAULT_LOCALE.

export type Messages = typeof en;

async function loadMessages(locale: AppLocale): Promise<Messages> {
  const messages = (await import(`../../messages/${locale}.json`)) as {
    default: Messages;
  };
  return messages.default;
}

export async function currentLocale(): Promise<AppLocale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    cookie: cookieStore.get(localeCookieName(env.SESSION_COOKIE_PREFIX))?.value,
    acceptLanguage: headerList.get("accept-language"),
    defaultLocale: env.NEXT_PUBLIC_DEFAULT_LOCALE,
  });
}

export default getRequestConfig(async () => {
  const locale = await currentLocale();
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: SERVER_TIME_ZONE,
  };
});
