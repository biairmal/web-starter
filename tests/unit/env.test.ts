import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "@/config/env-schema";

const key = (bytes: number) => Buffer.alloc(bytes, 7).toString("base64");

const valid = {
  APP_URL: "http://localhost:3000",
  IDENTITY_INTERNAL_URL: "http://identity:8080",
  IDENTITY_PUBLIC_URL: "https://id.example.com",
  SESSION_SECRET: key(32),
};

describe("environment validation", () => {
  it("accepts a complete environment and applies defaults", () => {
    const env = parseEnv(valid);
    expect(env.SESSION_COOKIE_PREFIX).toBe("ws");
    expect(env.TRUSTED_PROXY_HOPS).toBe(1);
    expect(env.NEXT_PUBLIC_DEFAULT_LOCALE).toBe("en");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SESSION_SECRET).toEqual([key(32)]);
  });

  it("names SESSION_SECRET when it is missing", () => {
    const rest: Record<string, string | undefined> = { ...valid };
    delete rest.SESSION_SECRET;
    expect(() => parseEnv(rest)).toThrow(EnvError);
    expect(() => parseEnv(rest)).toThrow(/SESSION_SECRET/);
  });

  it("names SESSION_SECRET when a key is shorter than 32 bytes", () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: key(16) })).toThrow(
      /SESSION_SECRET: must decode to at least 32 bytes/,
    );
  });

  it("accepts several keys for rotation and trims spaces", () => {
    const env = parseEnv({
      ...valid,
      SESSION_SECRET: `${key(32)} , ${key(48)}`,
    });
    expect(env.SESSION_SECRET).toHaveLength(2);
  });

  it("names the bad URL variable", () => {
    expect(() => parseEnv({ ...valid, APP_URL: "not a url" })).toThrow(
      /APP_URL: must be an absolute URL/,
    );
  });

  it("rejects a locale the app does not ship", () => {
    expect(() =>
      parseEnv({ ...valid, NEXT_PUBLIC_DEFAULT_LOCALE: "fr" }),
    ).toThrow(/NEXT_PUBLIC_DEFAULT_LOCALE/);
  });
});
