import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { type Page, expect } from "@playwright/test";

// Shared pieces of the full e2e suite (tests/e2e/full). The stack is
// deploy/compose.e2e.yaml, started by scripts/e2e-full.mts. Journeys go
// through the browser; the setup a journey needs (an account with a role, a
// second tenant) goes straight to identity's API, which is faster and is
// not what the test is about.

export const IDENTITY = "http://localhost:8080";
export const FAKE_GOOGLE = "http://localhost:9090";
export const tenancy = process.env.E2E_TENANCY ?? "single";

/** From deploy/compose.e2e.yaml. Changed at the first sign-in (setup project). */
export const SUPER_ADMIN = {
  email: "super@e2e.test",
  tempPassword:
    process.env.E2E_SUPER_ADMIN_TEMP_PASSWORD ?? "Temp-Super-2026-e2e",
  password: "super-e2e-granite-harbor",
} as const;

/** The password every account the suite creates uses. */
export const PASSWORD = "e2e-copper-meadow-41";

export function uniqueEmail(tag: string): string {
  return `${tag}-${randomBytes(4).toString("hex")}@e2e.test`;
}

export function uniqueName(tag: string): string {
  return `${tag} ${randomBytes(3).toString("hex")}`;
}

// ---------------------------------------------------------------- mail --

type MailTemplate =
  "verify_email" | "reset_password" | "invite" | "existing_account";

function recipientHash(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Every link identity's logging mailer wrote for this recipient and template,
 * oldest first, read from the worker's log.
 */
export function mailLinks(email: string, template: MailTemplate): string[] {
  const file = process.env.E2E_COMPOSE_FILE;
  const project = process.env.E2E_COMPOSE_PROJECT;
  if (!file || !project) {
    throw new Error("Run the full suite through `pnpm e2e:full`.");
  }
  const log = execFileSync(
    "docker",
    [
      "compose",
      "-f",
      file,
      "-p",
      project,
      "logs",
      "--no-log-prefix",
      "--no-color",
      "identity-worker",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const hash = recipientHash(email);
  const links: string[] = [];
  for (const line of log.split("\n")) {
    if (!line.includes(hash)) {
      continue;
    }
    try {
      const entry = JSON.parse(line) as Record<string, unknown>;
      if (
        entry.recipient_hash === hash &&
        entry.template === template &&
        typeof entry.link === "string"
      ) {
        links.push(entry.link);
      }
    } catch {
      // not a JSON log line
    }
  }
  return links;
}

/**
 * Waits for a mail newer than the `known` ones and returns its link. The
 * worker sends from an outbox, so it can take a few seconds.
 */
export async function nextMailLink(
  email: string,
  template: MailTemplate,
  known = 0,
): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      () => {
        const links = mailLinks(email, template);
        link = links.length > known ? links.at(-1) : undefined;
        return link !== undefined;
      },
      {
        message: `a ${template} mail to ${email}`,
        timeout: 30_000,
        intervals: [500, 1000],
      },
    )
    .toBe(true);
  return link ?? "";
}

/** The `#token=` of a mail link. */
export function tokenOf(link: string): string {
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
  if (!token) {
    throw new Error(`no token in ${link}`);
  }
  return token;
}

/** The link's path and fragment, for `page.goto` against the base URL. */
export function pathOf(link: string): string {
  const url = new URL(link);
  return `${url.pathname}${url.search}${url.hash}`;
}

// ---------------------------------------------------------- identity API --

type Envelope<T> = {
  data?: T;
  error?: { code: string; message: string; meta?: { reason?: string } };
};

export class IdentityError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

export async function identity<T>(
  method: string,
  path: string,
  options: {
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<T> {
  const response = await fetch(`${IDENTITY}${path}`, {
    method,
    headers: {
      ...(options.body === undefined
        ? {}
        : { "content-type": "application/json" }),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  const envelope = (text ? JSON.parse(text) : {}) as Envelope<T>;
  if (!response.ok) {
    throw new IdentityError(
      response.status,
      envelope.error?.meta?.reason,
      `${method} ${path}: ${String(response.status)} ${envelope.error?.message ?? text}`,
    );
  }
  return envelope.data as T;
}

type Tokens = {
  access_token: string;
  refresh_token: string;
  must_change_password?: boolean;
};

export async function login(
  email: string,
  password: string,
  tenant?: string,
): Promise<Tokens> {
  return identity<Tokens>("POST", "/v1/auth/login", {
    body: { email, password, ...(tenant ? { tenant } : {}) },
  });
}

/**
 * The super admin's access token. If the first-sign-in password change has
 * not happened yet (the setup project does it through the UI), it is done
 * here through the API.
 */
export async function superAdminToken(tenant?: string): Promise<string> {
  try {
    const tokens = await login(SUPER_ADMIN.email, SUPER_ADMIN.password, tenant);
    return tokens.access_token;
  } catch (error) {
    if (!(error instanceof IdentityError) || error.status !== 401) {
      throw error;
    }
  }
  const restricted = await login(
    SUPER_ADMIN.email,
    SUPER_ADMIN.tempPassword,
    tenant,
  );
  const tokens = await identity<Tokens>("POST", "/v1/me/password", {
    token: restricted.access_token,
    body: { new_password: SUPER_ADMIN.password },
  });
  return tokens.access_token;
}

type RoleRow = { id: string; name: string };

export async function roleIds(
  token: string,
  names: string[],
): Promise<string[]> {
  const page = await identity<{ items?: RoleRow[] }>(
    "GET",
    "/v1/admin/roles?size=100",
    { token },
  );
  return names.map((name) => {
    const role = page.items?.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );
    if (!role) {
      throw new Error(`no role ${name}`);
    }
    return role.id;
  });
}

export type Account = { email: string; password: string; name: string };

/**
 * An account in the caller's tenant with these roles: invited by `adminToken`
 * and accepted through the API.
 */
export async function createAccount(
  tag: string,
  roles: string[],
  adminToken?: string,
): Promise<Account> {
  const token = adminToken ?? (await superAdminToken());
  const account = {
    email: uniqueEmail(tag),
    password: PASSWORD,
    name: uniqueName(tag.charAt(0).toUpperCase() + tag.slice(1)),
  };
  const known = mailLinks(account.email, "invite").length;
  await identity("POST", "/v1/admin/users/invite", {
    token,
    body: {
      email: account.email,
      display_name: account.name,
      role_ids: await roleIds(token, roles),
    },
  });
  const link = await nextMailLink(account.email, "invite", known);
  await identity("POST", "/v1/auth/invite/accept", {
    body: {
      token: tokenOf(link),
      password: account.password,
      display_name: account.name,
    },
  });
  return account;
}

// ------------------------------------------------------------------ UI --

/** Signs in through the sign-in page and waits for the landing page. */
export async function signInWithPassword(
  page: Page,
  account: Pick<Account, "email" | "password">,
  next = "/",
): Promise<void> {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(next);
}

export async function openAccountMenu(page: Page): Promise<void> {
  await page.getByRole("button", { name: /Open account menu/ }).click();
}
