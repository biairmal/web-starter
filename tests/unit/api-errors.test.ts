import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BFF_REASONS,
  REASON_TREATMENTS,
  errorMessage,
  errorMessageValues,
  isReason,
} from "@/lib/api/errors";
import en from "../../messages/en.json";

/** The `Reason` enum as written in the committed OpenAPI file. */
function specReasons(): string[] {
  const yaml = readFileSync(
    new URL("../../openapi/identity.yaml", import.meta.url),
    "utf8",
  );
  const block =
    /^ {4}Reason:\n(?: {6}.*\n)*? {6}enum:\n((?: {8}- .*\n)+)/m.exec(yaml);
  if (!block?.[1]) {
    throw new Error("Reason enum not found in openapi/identity.yaml");
  }
  return block[1]
    .split("\n")
    .map((line) => line.replace(/^\s*-\s*/, "").trim())
    .filter((line) => line.length > 0);
}

describe("error mapping", () => {
  it("has a treatment for every reason in the OpenAPI enum and every BFF reason", () => {
    const reasons = [...specReasons(), ...BFF_REASONS];
    expect(reasons.length).toBeGreaterThan(BFF_REASONS.length);
    const unmapped = reasons.filter((reason) => !isReason(reason));
    expect(unmapped).toEqual([]);
  });

  it("maps no reason that the spec and the BFF do not define", () => {
    const known = new Set<string>([...specReasons(), ...BFF_REASONS]);
    const stale = Object.keys(REASON_TREATMENTS).filter(
      (reason) => !known.has(reason),
    );
    expect(stale).toEqual([]);
  });

  it("has an English message for every mapped reason", () => {
    const missing = Object.keys(REASON_TREATMENTS).filter(
      (reason) => !(reason in en.errors.reasons),
    );
    expect(missing).toEqual([]);
  });

  it("uses the TRD 10 treatments", () => {
    expect(
      errorMessage({ status: 401, reason: "INVALID_CREDENTIALS" }),
    ).toEqual({ key: "reasons.INVALID_CREDENTIALS", treatment: "form" });
    expect(errorMessage({ status: 422, reason: "PASSWORD_POLICY" })).toEqual({
      key: "reasons.PASSWORD_POLICY",
      treatment: "field",
    });
    expect(errorMessage({ status: 409, reason: "VERSION_CONFLICT" })).toEqual({
      key: "reasons.VERSION_CONFLICT",
      treatment: "conflict",
    });
    expect(errorMessage({ status: 401, reason: "SESSION_ENDED" })).toEqual({
      key: "reasons.SESSION_ENDED",
      treatment: "redirect",
    });
    expect(errorMessage({ status: 403, reason: "ACCOUNT_DISABLED" })).toEqual({
      key: "reasons.ACCOUNT_DISABLED",
      treatment: "fullPage",
    });
  });

  it("shows the forbidden state for a 403 without a reason", () => {
    expect(errorMessage({ status: 403 })).toEqual({
      key: "generic.forbidden",
      treatment: "forbidden",
    });
  });

  it("shows a toast for a 5xx without a known reason", () => {
    expect(errorMessage({ status: 502 })).toEqual({
      key: "generic.unavailable",
      treatment: "toast",
    });
    expect(
      errorMessage({ status: 503, reason: "UPSTREAM_UNAVAILABLE" }),
    ).toEqual({ key: "reasons.UPSTREAM_UNAVAILABLE", treatment: "toast" });
  });

  it("falls back to the server message for an unknown reason on a 4xx", () => {
    expect(errorMessage({ status: 400, reason: "SOMETHING_NEW" })).toBeNull();
    expect(errorMessage({ status: 400 })).toBeNull();
  });

  it("turns the retry delay into whole minutes and seconds", () => {
    const brand = { supportEmail: "help@example.com", appName: "Acme" };
    expect(errorMessageValues({ retryAfter: 61 }, brand)).toEqual({
      minutes: 2,
      seconds: 61,
      supportEmail: "help@example.com",
      appName: "Acme",
    });
    expect(errorMessageValues({}, brand)).toMatchObject({
      minutes: 1,
      seconds: 60,
    });
  });
});
