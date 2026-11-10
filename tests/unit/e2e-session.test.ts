import { describe, expect, it } from "vitest";
import { sessionFrom } from "@/lib/session/server";
import { SESSION_SECRET, testEnv } from "../e2e/env";
import { sessionCookies } from "../e2e/session";

// The e2e sign-in helper repeats the BFF's cookie sealing, because Playwright
// cannot import `server-only` modules. This keeps the two in step.

describe("e2e session cookies", () => {
  it("use the same secret and prefix as the unit-test environment", () => {
    expect(process.env.SESSION_SECRET).toBe(SESSION_SECRET);
    expect(process.env.SESSION_COOKIE_PREFIX).toBe(
      testEnv.SESSION_COOKIE_PREFIX,
    );
  });

  it("open as a session in the BFF, with the claims they were made with", async () => {
    const cookies = await sessionCookies({ perms: ["users:read"], sa: false });
    const jar = new Map(cookies.map((cookie) => [cookie.name, cookie]));
    const session = await sessionFrom({ get: (name) => jar.get(name) });
    expect(session).not.toBeNull();
    expect(session?.claims.perms).toEqual(["users:read"]);
    expect(session?.sessionId).toBe("00000000-0000-4000-8000-0000000000aa");
  });
});
