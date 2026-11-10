// Supported locales and how the request's locale is chosen (TRD 12). Pure, so
// both the server request config and client components can import it.

export const locales = ["en", "id"] as const;

export type AppLocale = (typeof locales)[number];

export const fallbackLocale: AppLocale = "en";

/** The locale cookie lasts one year (TRD 5.1). */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Times on the server are rendered in UTC. */
export const SERVER_TIME_ZONE = "UTC";

export function isLocale(value: unknown): value is AppLocale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/** The locale cookie's name, `{prefix}_locale` (TRD 5.1). */
export function localeCookieName(prefix: string): string {
  return `${prefix}_locale`;
}

/**
 * The supported locale an `Accept-Language` header prefers most, or
 * `undefined`. Entries are ordered by their `q` weight; a regional tag such as
 * `id-ID` matches its base language.
 */
export function negotiateLocale(
  header: string | null | undefined,
): AppLocale | undefined {
  if (!header) {
    return undefined;
  }
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return {
        language: tag.trim().toLowerCase().split("-")[0] ?? "",
        weight: Number.isFinite(weight) ? weight : 0,
        index,
      };
    })
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  return ranked.map((entry) => entry.language).find(isLocale);
}

/** Cookie first, then `Accept-Language`, then the configured default. */
export function resolveLocale(input: {
  cookie: string | undefined;
  acceptLanguage: string | null | undefined;
  defaultLocale: AppLocale;
}): AppLocale {
  if (isLocale(input.cookie)) {
    return input.cookie;
  }
  return negotiateLocale(input.acceptLanguage) ?? input.defaultLocale;
}
