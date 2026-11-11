import { REQUESTED_WITH } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

// The browser's calls to the BFF's own routes under /api/auth (TRD 7.2, 7.3),
// which are not identity paths and so are not in the generated client. Same
// rules as the client: the CSRF header on every call, `data` of the envelope
// on success, `ApiError` on failure.

async function bodyOf(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function send<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    // Absolute in a browser, because a relative URL cannot build a Request
    // outside one (the same rule as the API client).
    const url =
      typeof window === "undefined" ? path : `${window.location.origin}${path}`;
    response = await globalThis.fetch(url, {
      method,
      headers: {
        "X-Requested-With": REQUESTED_WITH,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError({ status: 0, reason: "UPSTREAM_UNAVAILABLE" });
  }
  const parsed = await bodyOf(response);
  if (!response.ok) {
    throw ApiError.from(response, parsed);
  }
  return (
    typeof parsed === "object" && parsed !== null && "data" in parsed
      ? parsed.data
      : undefined
  ) as T;
}

/** `POST` to a BFF route; resolves to the envelope's `data`. */
export function bffPost<T = undefined>(path: string, body?: unknown) {
  return send<T>("POST", path, body ?? {});
}

/** `GET` a BFF route; resolves to the envelope's `data`. */
export function bffGet<T>(path: string) {
  return send<T>("GET", path);
}
