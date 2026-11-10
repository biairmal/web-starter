import "server-only";

import { NextResponse } from "next/server";
import type { BffReason } from "@/lib/api/errors";
import type { ErrorReason } from "@/lib/api/types";

export type { BffReason } from "@/lib/api/errors";

// The BFF's own errors use identity's envelope (BE TRD 9.1), so the browser
// handles every error the same way (TRD 7.1).

/** Why a session ended: identity's reason, or `NO_SESSION` when none was sent. */
export type SessionEndCause = ErrorReason | "NO_SESSION";

export type ErrorMeta = {
  reason?: BffReason | ErrorReason;
  cause?: SessionEndCause;
  [key: string]: unknown;
};

export type ErrorBody = {
  timestamp: string;
  error: { code: string; message: string; meta?: ErrorMeta };
};

export class BffError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly meta?: ErrorMeta,
  ) {
    super(message);
    this.name = "BffError";
  }

  get reason(): ErrorMeta["reason"] {
    return this.meta?.reason;
  }

  static sessionEnded(cause: SessionEndCause): BffError {
    return new BffError(401, "ERR_UNAUTHORIZED", "The session has ended.", {
      reason: "SESSION_ENDED",
      cause,
    });
  }

  static csrfFailed(): BffError {
    return new BffError(
      403,
      "ERR_FORBIDDEN",
      "The request failed the CSRF check.",
      {
        reason: "CSRF_FAILED",
      },
    );
  }

  static notAllowed(): BffError {
    return new BffError(404, "ERR_NOT_FOUND", "This path is not available.", {
      reason: "NOT_ALLOWED",
    });
  }

  static upstreamUnavailable(): BffError {
    return new BffError(
      503,
      "ERR_SERVICE_UNAVAILABLE",
      "A service the app depends on is unavailable.",
      { reason: "UPSTREAM_UNAVAILABLE" },
    );
  }

  static payloadTooLarge(): BffError {
    return new BffError(
      413,
      "ERR_BAD_REQUEST",
      "The request body is too large.",
    );
  }

  static internal(): BffError {
    return new BffError(500, "ERR_INTERNAL", "Something went wrong.");
  }
}

export function errorBody(error: BffError): ErrorBody {
  return {
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      ...(error.meta ? { meta: error.meta } : {}),
    },
  };
}

export function errorResponse(error: BffError): NextResponse {
  return NextResponse.json(errorBody(error), { status: error.status });
}

/** Reads `error.meta.reason` from an identity error body, if there is one. */
export function reasonOf(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return undefined;
  }
  const { error } = body;
  if (typeof error !== "object" || error === null || !("meta" in error)) {
    return undefined;
  }
  const { meta } = error;
  if (typeof meta !== "object" || meta === null || !("reason" in meta)) {
    return undefined;
  }
  return typeof meta.reason === "string" ? meta.reason : undefined;
}
