import type { ErrorReason } from "@/lib/api/types";

// Errors from the BFF, and how the UI treats each `meta.reason` (TRD 10,
// DESIGN_BRIEF 8.2). Safe for both server and browser code.

/** Reasons only the BFF returns, next to identity's `ErrorReason` (TRD 7.1). */
export const BFF_REASONS = [
  "SESSION_ENDED",
  "CSRF_FAILED",
  "NOT_ALLOWED",
  "UPSTREAM_UNAVAILABLE",
] as const;

export type BffReason = (typeof BFF_REASONS)[number];

/** Every reason the browser can receive. */
export type Reason = ErrorReason | BffReason;

/**
 * Where an error shows (TRD 10):
 * - `form`: one error above the submit button
 * - `field`: on the inputs named in `meta.fields`
 * - `notice`: an inline notice with an action
 * - `fullPage`: the user cannot go on; a full-page notice with the support email
 * - `toast`: a toast, with the request ID for server failures
 * - `page`: a page state, such as an expired link
 * - `banner`: a banner on the sign-in page, through `?reason=`
 * - `rule`: a dialog or toast that explains a business rule
 * - `conflict`: the version-conflict banner (TRD 8.5)
 * - `redirect`: go to sign-in (TRD 5.6)
 * - `forbidden`: the forbidden state in place of the content
 */
export type Treatment =
  | "form"
  | "field"
  | "notice"
  | "fullPage"
  | "toast"
  | "page"
  | "banner"
  | "rule"
  | "conflict"
  | "redirect"
  | "forbidden";

/** Typed as a full record, so a reason added to the spec fails the type check. */
export const REASON_TREATMENTS: Readonly<Record<Reason, Treatment>> = {
  INVALID_CREDENTIALS: "form",
  ACCOUNT_LOCKED: "form",
  EMAIL_NOT_VERIFIED: "notice",
  ACCOUNT_DISABLED: "fullPage",
  TENANT_SUSPENDED: "fullPage",
  RATE_LIMITED: "toast",
  PASSWORD_POLICY: "field",
  TOKEN_INVALID: "page",
  REGISTRATION_CLOSED: "banner",
  PROVIDER_DISABLED: "banner",
  OAUTH_STATE_INVALID: "banner",
  OAUTH_EMAIL_UNVERIFIED: "banner",
  OAUTH_DOMAIN_NOT_ALLOWED: "banner",
  PERMISSION_NOT_HELD: "rule",
  SELF_ESCALATION: "rule",
  SELF_ACTION: "rule",
  LAST_ADMIN: "rule",
  SYSTEM_ROLE: "rule",
  SUPER_ADMIN_PROTECTED: "rule",
  ROLE_IN_USE: "rule",
  LAST_SIGN_IN_METHOD: "rule",
  VERSION_CONFLICT: "conflict",
  DUPLICATE: "field",
  ALREADY_MEMBER: "field",
  NOT_A_MEMBER: "toast",
  // A refused refresh ends the session; sign-in shows why.
  PASSWORD_CHANGE_REQUIRED: "banner",
  REFRESH_REUSED: "banner",
  REFRESH_EXPIRED: "banner",
  // Not an error on login (the tenant picker); from the Google callback, a banner.
  TENANT_REQUIRED: "banner",
  SESSION_ENDED: "redirect",
  CSRF_FAILED: "toast",
  NOT_ALLOWED: "toast",
  UPSTREAM_UNAVAILABLE: "toast",
};

export function isReason(value: unknown): value is Reason {
  return typeof value === "string" && Object.hasOwn(REASON_TREATMENTS, value);
}

/** A message key under the `errors` namespace of `messages/*.json`. */
export type ErrorMessageKey =
  | `reasons.${Reason}`
  | "generic.forbidden"
  | "generic.unavailable"
  | "generic.unexpected";

export type ErrorDescription = { key: ErrorMessageKey; treatment: Treatment };

/** An error response from the BFF, as thrown by `unwrap()`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** `meta.reason`, when identity or the BFF sent one. */
  readonly reason: string | undefined;
  /** `meta.cause` on SESSION_ENDED: identity's reason, or `NO_SESSION`. */
  readonly sessionEndCause: string | undefined;
  /** `meta.fields`: per-field messages keyed by JSON field name. */
  readonly fields: Readonly<Record<string, string>>;
  /** Seconds to wait, from `meta.retry_after` or the `Retry-After` header. */
  readonly retryAfter: number | undefined;
  /** `X-Request-Id`, shown to the user for support. */
  readonly requestId: string | undefined;

  constructor(init: {
    status: number;
    code?: string;
    message?: string;
    reason?: string;
    sessionEndCause?: string;
    fields?: Record<string, string>;
    retryAfter?: number;
    requestId?: string;
  }) {
    super(init.message ?? `Request failed with status ${String(init.status)}`);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code ?? "ERR_UNKNOWN";
    this.reason = init.reason;
    this.sessionEndCause = init.sessionEndCause;
    this.fields = init.fields ?? {};
    this.retryAfter = init.retryAfter;
    this.requestId = init.requestId;
  }

  /** Builds the error from a failed response and its parsed body, if any. */
  static from(response: Response, body: unknown): ApiError {
    const error = field(body, "error");
    const meta = field(error, "meta");
    const headerRetry = Number(response.headers.get("retry-after"));
    const metaRetry = field(meta, "retry_after");
    const retryAfter =
      typeof metaRetry === "number"
        ? metaRetry
        : Number.isFinite(headerRetry) && headerRetry > 0
          ? headerRetry
          : undefined;
    return new ApiError({
      status: response.status,
      ...optionalString("code", field(error, "code")),
      ...optionalString("message", field(error, "message")),
      ...optionalString("reason", field(meta, "reason")),
      ...optionalString("sessionEndCause", field(meta, "cause")),
      fields: stringRecord(field(meta, "fields")),
      ...(retryAfter === undefined ? {} : { retryAfter }),
      ...optionalString("requestId", response.headers.get("x-request-id")),
    });
  }

  get isSessionEnded(): boolean {
    return this.reason === "SESSION_ENDED";
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/**
 * The message key and treatment for an error, or `null` when there is no
 * mapping (an unknown reason on a 4xx): show `error.message` then.
 */
export function errorMessage(error: {
  status: number;
  reason?: string | undefined;
}): ErrorDescription | null {
  if (isReason(error.reason)) {
    return {
      key: `reasons.${error.reason}`,
      treatment: REASON_TREATMENTS[error.reason],
    };
  }
  if (error.status === 403) {
    return { key: "generic.forbidden", treatment: "forbidden" };
  }
  if (error.status >= 500) {
    return { key: "generic.unavailable", treatment: "toast" };
  }
  return null;
}

export type ErrorMessageValues = {
  minutes: number;
  seconds: number;
  supportEmail: string;
  appName: string;
};

/** ICU values the error messages use (`messages/en.json` `errors`). */
export function errorMessageValues(
  error: { retryAfter?: number | undefined },
  brand: { supportEmail: string; appName: string },
): ErrorMessageValues {
  const seconds = Math.max(1, Math.ceil(error.retryAfter ?? 60));
  return {
    minutes: Math.ceil(seconds / 60),
    seconds,
    supportEmail: brand.supportEmail,
    appName: brand.appName,
  };
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

function optionalString<K extends string>(
  key: K,
  value: unknown,
): Partial<Record<K, string>> {
  return typeof value === "string" && value.length > 0
    ? ({ [key]: value } as Record<K, string>)
    : {};
}

function stringRecord(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
