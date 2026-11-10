import "server-only";

// Open-redirect guard for `next` values (TRD 11.1): only a same-origin path is
// kept; anything else becomes "/".

const MAX_LENGTH = 2048;
const PROBE_ORIGIN = "http://next-path.invalid";
// Control characters, space, DEL and backslash.
const UNSAFE_CHARACTERS = /[\x00-\x20\x7f\\]/;

/**
 * Returns `value` when it is a path on this origin ("/admin?x=1#y"), else
 * `fallback`. Rejects protocol-relative ("//host"), backslash ("/\host"),
 * absolute and scheme URLs, whitespace and control characters.
 */
export function safeNext(value: unknown, fallback = "/"): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_LENGTH
  ) {
    return fallback;
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    UNSAFE_CHARACTERS.test(value)
  ) {
    return fallback;
  }
  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) {
    return fallback;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
