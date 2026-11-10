import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";
import {
  isLocale,
  localeCookieName,
  negotiateLocale,
  resolveLocale,
} from "@/i18n/config";

describe("resolveLocale", () => {
  it("uses the locale cookie first", () => {
    expect(
      resolveLocale({
        cookie: "id",
        acceptLanguage: "en-US,en;q=0.9",
        defaultLocale: "en",
      }),
    ).toBe("id");
  });

  it("falls back to Accept-Language when the cookie is missing or unsupported", () => {
    expect(
      resolveLocale({
        cookie: undefined,
        acceptLanguage: "id-ID,id;q=0.9,en;q=0.8",
        defaultLocale: "en",
      }),
    ).toBe("id");
    expect(
      resolveLocale({
        cookie: "fr",
        acceptLanguage: "id",
        defaultLocale: "en",
      }),
    ).toBe("id");
  });

  it("falls back to the default when nothing matches", () => {
    expect(
      resolveLocale({
        cookie: undefined,
        acceptLanguage: "fr-FR,de;q=0.5",
        defaultLocale: "id",
      }),
    ).toBe("id");
    expect(
      resolveLocale({
        cookie: undefined,
        acceptLanguage: null,
        defaultLocale: "en",
      }),
    ).toBe("en");
  });
});

describe("negotiateLocale", () => {
  it("orders by q weight, then by position", () => {
    expect(negotiateLocale("en;q=0.4, id;q=0.8")).toBe("id");
    expect(negotiateLocale("fr, en, id")).toBe("en");
  });

  it("ignores entries with q=0 and malformed weights", () => {
    expect(negotiateLocale("id;q=0, en;q=0.1")).toBe("en");
    expect(negotiateLocale("id;q=abc, en")).toBe("en");
  });

  it("matches a regional tag to its base language, ignoring case", () => {
    expect(negotiateLocale("ID-id")).toBe("id");
  });

  it("returns undefined for an empty or unsupported header", () => {
    expect(negotiateLocale("")).toBeUndefined();
    expect(negotiateLocale("*")).toBeUndefined();
  });
});

describe("locale helpers", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("id")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("names the cookie after the session cookie prefix", () => {
    expect(localeCookieName("ws")).toBe("ws_locale");
  });
});

describe("dates per locale", () => {
  const date = new Date("2026-11-10T09:14:00Z");

  it("renders dates in the active locale's format", () => {
    const en = createFormatter({ locale: "en", timeZone: "UTC" });
    const id = createFormatter({ locale: "id", timeZone: "UTC" });
    expect(en.dateTime(date, { dateStyle: "long" })).toBe("November 10, 2026");
    expect(id.dateTime(date, { dateStyle: "long" })).toBe("10 November 2026");
  });

  it("formats numbers with the locale's separators", () => {
    const en = createFormatter({ locale: "en", timeZone: "UTC" });
    const id = createFormatter({ locale: "id", timeZone: "UTC" });
    expect(en.number(1284.5)).toBe("1,284.5");
    expect(id.number(1284.5)).toBe("1.284,5");
  });
});
