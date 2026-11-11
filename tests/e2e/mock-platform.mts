import type { IncomingMessage, ServerResponse } from "node:http";
import { MOCK_TENANTS } from "./mock-users.ts";

// The super admin's endpoints of the mock identity (BE TRD 9.7), kept per
// session ID (`sid`) like tests/e2e/mock-admin.mts, so every test starts from
// the same seed. Like identity, they answer 404 in single mode (the default;
// MOCK_TENANCY=multi turns multi mode on) and 403 without the super admin's
// `sa` claim.
//
// - GET /v1/admin/tenants: status and search (name or slug contains), paging.
// - POST /v1/admin/tenants: 409 DUPLICATE for a slug in use, else 201.
// - GET /v1/admin/tenants/{id}.
// - PATCH /v1/admin/tenants/{id}: 428 without If-Match, VERSION_CONFLICT for
//   a stale one, 409 for suspending the default tenant. Each save raises the
//   version.

export type PlatformClaims = { sid?: string; sa?: boolean };

type MockTenant = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended";
  member_count: number;
  created_at: string;
  version: number;
};

/** The default tenant: the super admin's home, which cannot be suspended. */
export const MOCK_DEFAULT_TENANT_ID = "00000000-0000-4000-8000-000000000002";

/** What the seed adds to each tenant in tests/e2e/mock-users.ts, by slug. */
const SEED: Record<string, Omit<MockTenant, "id" | "slug" | "name">> = {
  acme: {
    status: "active",
    member_count: 12,
    created_at: "2026-10-01T00:00:00Z",
    version: 3,
  },
  globex: {
    status: "suspended",
    member_count: 4,
    created_at: "2026-10-02T00:00:00Z",
    version: 5,
  },
};

function seedTenants(): MockTenant[] {
  return [
    {
      id: MOCK_DEFAULT_TENANT_ID,
      slug: "default",
      name: "Default",
      status: "active",
      member_count: 3,
      created_at: "2026-09-01T00:00:00Z",
      version: 1,
    },
    ...MOCK_TENANTS.map((tenant) => ({
      status: "active" as const,
      member_count: 0,
      created_at: "2026-10-01T00:00:00Z",
      version: 1,
      ...SEED[tenant.slug],
      ...tenant,
    })),
  ];
}

type Platform = { tenants: MockTenant[]; nextId: number };

const platforms = new Map<string, Platform>();

function platformOf(claims: PlatformClaims): Platform {
  const key = claims.sid ?? "shared";
  let platform = platforms.get(key);
  if (!platform) {
    platform = { tenants: seedTenants(), nextId: 1 };
    platforms.set(key, platform);
  }
  return platform;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const envelope = (data: unknown) => ({
  timestamp: new Date().toISOString(),
  data,
});

function fail(
  res: ServerResponse,
  status: number,
  code: string,
  reason?: string,
): void {
  json(res, status, {
    timestamp: new Date().toISOString(),
    error: {
      code,
      message: reason ?? code,
      ...(reason ? { meta: { reason } } : {}),
    },
  });
}

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(
          JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
            string,
            unknown
          >,
        );
      } catch {
        resolve({});
      }
    });
  });
}

function pageOf<T>(items: T[], query: URLSearchParams) {
  const size = Math.min(100, Math.max(1, Number(query.get("size")) || 25));
  const page = Math.max(1, Number(query.get("page")) || 1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  return {
    items: items.slice((page - 1) * size, page * size),
    total,
    page,
    size,
    total_pages: totalPages,
    has_prev: page > 1,
    has_next: page < totalPages,
  };
}

/** The version an update is based on: `If-Match: "3"`. */
function versionOf(req: IncomingMessage): number | undefined {
  const match = /^"?(\d+)"?$/.exec(req.headers["if-match"] ?? "");
  return match ? Number(match[1]) : undefined;
}

function listTenants(
  res: ServerResponse,
  platform: Platform,
  query: URLSearchParams,
): void {
  const status = query.get("status");
  const search = (query.get("search") ?? "").toLowerCase();
  const items = platform.tenants.filter(
    (tenant) =>
      (!status || tenant.status === status) &&
      (!search ||
        tenant.name.toLowerCase().includes(search) ||
        tenant.slug.includes(search)),
  );
  json(res, 200, envelope(pageOf(items, query)));
}

async function createTenant(
  req: IncomingMessage,
  res: ServerResponse,
  platform: Platform,
): Promise<void> {
  const body = await readBody(req);
  const slug = typeof body.slug === "string" ? body.slug : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug) || !name) {
    fail(res, 400, "ERR_VALIDATION");
    return;
  }
  if (platform.tenants.some((tenant) => tenant.slug === slug)) {
    fail(res, 409, "ERR_CONFLICT", "DUPLICATE");
    return;
  }
  const tenant: MockTenant = {
    id: `00000000-0000-4000-8000-0000000c${String(platform.nextId).padStart(4, "0")}`,
    slug,
    name,
    status: "active",
    member_count: 0,
    created_at: new Date().toISOString(),
    version: 1,
  };
  platform.nextId += 1;
  platform.tenants.push(tenant);
  json(res, 201, envelope(tenant));
}

async function updateTenant(
  req: IncomingMessage,
  res: ServerResponse,
  platform: Platform,
  id: string,
): Promise<void> {
  const body = await readBody(req);
  const tenant = platform.tenants.find((entry) => entry.id === id);
  if (!tenant) {
    fail(res, 404, "ERR_NOT_FOUND");
    return;
  }
  const version = versionOf(req);
  if (version === undefined) {
    fail(res, 428, "ERR_PRECONDITION_REQUIRED");
    return;
  }
  if (version !== tenant.version) {
    fail(res, 409, "ERR_CONFLICT", "VERSION_CONFLICT");
    return;
  }
  if (body.status === "suspended" && tenant.id === MOCK_DEFAULT_TENANT_ID) {
    fail(res, 409, "ERR_CONFLICT");
    return;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    tenant.name = body.name.trim();
  }
  if (body.status === "active" || body.status === "suspended") {
    tenant.status = body.status;
  }
  tenant.version += 1;
  json(res, 200, envelope(tenant));
}

type Handler = (platform: Platform, id: string) => unknown;

function routes(
  req: IncomingMessage,
  res: ServerResponse,
  query: URLSearchParams,
): [RegExp, Handler][] {
  return [
    [
      /^GET \/v1\/admin\/tenants$/,
      (platform) => {
        listTenants(res, platform, query);
      },
    ],
    [
      /^POST \/v1\/admin\/tenants$/,
      (platform) => createTenant(req, res, platform),
    ],
    [
      /^GET \/v1\/admin\/tenants\/[^/]+$/,
      (platform, id) => {
        const tenant = platform.tenants.find((entry) => entry.id === id);
        if (tenant) {
          json(res, 200, envelope(tenant));
        } else {
          fail(res, 404, "ERR_NOT_FOUND");
        }
      },
    ],
    [
      /^PATCH \/v1\/admin\/tenants\/[^/]+$/,
      (platform, id) => updateTenant(req, res, platform, id),
    ],
  ];
}

/**
 * Answers a super admin request and returns true, or returns false for a
 * path this module does not serve.
 */
export function platformRoute(
  req: IncomingMessage,
  res: ServerResponse,
  claims: PlatformClaims | undefined,
): boolean {
  const url = new URL(req.url ?? "/", "http://mock");
  const route = `${req.method ?? "GET"} ${url.pathname}`;
  const match = routes(req, res, url.searchParams).find(([pattern]) =>
    pattern.test(route),
  );
  if (!match) {
    return false;
  }
  if (process.env.MOCK_TENANCY !== "multi") {
    req.resume();
    fail(res, 404, "ERR_NOT_FOUND");
    return true;
  }
  if (!claims) {
    req.resume();
    fail(res, 401, "ERR_UNAUTHORIZED");
    return true;
  }
  if (claims.sa !== true) {
    req.resume();
    fail(res, 403, "ERR_FORBIDDEN");
    return true;
  }
  // /v1/admin/<resource>/<id>
  const id = decodeURIComponent(url.pathname.split("/")[4] ?? "");
  void match[1](platformOf(claims), id);
  return true;
}
