// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import { ApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import en from "../../messages/en.json";
import id from "../../messages/id.json";

function errorText(locale: "en" | "id") {
  const { result } = renderHook(useErrorText, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider
        locale={locale}
        messages={locale === "en" ? en : id}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    ),
  });
  return result.current;
}

describe("useErrorText", () => {
  it("fills the lockout minutes from the retry delay", () => {
    const text = errorText("en")(
      new ApiError({ status: 423, reason: "ACCOUNT_LOCKED", retryAfter: 120 }),
    );
    expect(text).toEqual({
      text: "Too many attempts. Try again in 2 minutes.",
      treatment: "form",
      requestId: undefined,
    });
    expect(
      errorText("en")(
        new ApiError({ status: 423, reason: "ACCOUNT_LOCKED", retryAfter: 30 }),
      ).text,
    ).toBe("Too many attempts. Try again in 1 minute.");
  });

  it("names the support email for a disabled account", () => {
    expect(
      errorText("en")(new ApiError({ status: 403, reason: "ACCOUNT_DISABLED" }))
        .text,
    ).toBe(`Your account has been disabled. Contact ${brand.supportEmail}.`);
  });

  it("uses the active locale", () => {
    expect(
      errorText("id")(
        new ApiError({ status: 401, reason: "INVALID_CREDENTIALS" }),
      ).text,
    ).toBe("Email atau kata sandi salah.");
  });

  it("keeps the request ID of a server failure", () => {
    expect(
      errorText("en")(new ApiError({ status: 502, requestId: "req-9" })),
    ).toEqual({
      text: "Something went wrong. Try again.",
      treatment: "toast",
      requestId: "req-9",
    });
  });

  it("falls back to the server message for an unknown reason", () => {
    expect(
      errorText("en")(
        new ApiError({
          status: 400,
          reason: "SOMETHING_NEW",
          message: "Server says no.",
        }),
      ),
    ).toMatchObject({ text: "Server says no.", treatment: "unknown" });
  });

  it("shows the generic message for a network failure", () => {
    expect(errorText("en")(new TypeError("fetch failed")).text).toBe(
      "Something went wrong. Try again.",
    );
  });
});
