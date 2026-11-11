import type { IncomingMessage, ServerResponse } from "node:http";

// The admin endpoints of the mock identity (tests/e2e/mock-identity.mts).
// Prism's random data cannot show a filter or an invite take effect, so these
// answer from a small tenant kept per session ID (`sid`): every test signs in
// with its own session and sees a fresh copy of the seed.
//
// - GET /v1/admin/users: search (name contains, or the exact email), status,
//   membership_status, role, sort by display_name or created_at, paging.
// - POST /v1/admin/users/invite: 409 ALREADY_MEMBER for a member's email,
//   else 202 and an invited user.
// - GET /v1/admin/roles: paging and a name search.
//
// Each route answers 403 without its permission (`users:read`,
// `users:manage`, `roles:manage`), unless the token is the super admin's.

export type AdminClaims = { sid?: string; perms?: string[]; sa?: boolean };

type RoleRef = { id: string; name: string };

type MockUser = {
  id: string;
  email: string;
  display_name: string;
  status: "pending" | "active" | "disabled";
  membership_status: "invited" | "active" | "disabled";
  roles: RoleRef[];
  created_at: string;
  last_sign_in_at?: string;
};

type MockRole = {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  permissions: string[];
  version: number;
};

export const MOCK_ROLE_IDS = {
  admin: "00000000-0000-4000-8000-00000000a001",
  manager: "00000000-0000-4000-8000-00000000a002",
  sales: "00000000-0000-4000-8000-00000000a003",
} as const;

function seedRoles(): MockRole[] {
  return [
    {
      id: MOCK_ROLE_IDS.admin,
      name: "Admin",
      description: "Every permission in the tenant.",
      is_system: true,
      permissions: ["users:read", "users:manage", "roles:manage", "audit:read"],
      version: 1,
    },
    {
      id: MOCK_ROLE_IDS.manager,
      name: "Manager",
      description: "Reads users and the audit log.",
      is_system: false,
      permissions: ["users:read", "audit:read"],
      version: 3,
    },
    {
      id: MOCK_ROLE_IDS.sales,
      name: "Sales",
      is_system: false,
      permissions: ["notes:read"],
      version: 1,
    },
  ];
}

const ref = (role: MockRole): RoleRef => ({ id: role.id, name: role.name });

function seedUsers(roles: MockRole[]): MockUser[] {
  const [admin, manager, sales] = roles as [MockRole, MockRole, MockRole];
  const named: MockUser[] = [
    {
      id: "00000000-0000-4000-8000-00000000b001",
      email: "dina@example.test",
      display_name: "Dina Pratama",
      status: "active",
      membership_status: "active",
      roles: [ref(admin)],
      created_at: "2026-09-01T08:00:00Z",
      last_sign_in_at: "2026-11-10T08:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-00000000b002",
      email: "budi@example.test",
      display_name: "Budi Santoso",
      status: "pending",
      membership_status: "invited",
      roles: [ref(sales)],
      created_at: "2026-11-09T08:00:00Z",
    },
    {
      id: "00000000-0000-4000-8000-00000000b003",
      email: "citra@example.test",
      display_name: "Citra Lestari",
      status: "active",
      membership_status: "disabled",
      roles: [ref(manager), ref(sales)],
      created_at: "2026-10-05T08:00:00Z",
      last_sign_in_at: "2026-10-20T08:00:00Z",
    },
  ];
  // Enough members for a second page at 25 per page.
  const members = Array.from({ length: 27 }, (_, index): MockUser => {
    const n = String(index + 1).padStart(2, "0");
    return {
      id: `00000000-0000-4000-8000-00000000c0${n}`,
      email: `member${n}@example.test`,
      display_name: `Member ${n}`,
      status: "active",
      membership_status: "active",
      roles: [ref(sales)],
      created_at: `2026-08-${n}T08:00:00Z`,
      last_sign_in_at: "2026-11-01T08:00:00Z",
    };
  });
  return [...named, ...members];
}

type Tenant = { roles: MockRole[]; users: MockUser[]; nextId: number };

const tenants = new Map<string, Tenant>();

function tenantOf(claims: AdminClaims): Tenant {
  const key = claims.sid ?? "shared";
  let tenant = tenants.get(key);
  if (!tenant) {
    const roles = seedRoles();
    tenant = { roles, users: seedUsers(roles), nextId: 1 };
    tenants.set(key, tenant);
  }
  return tenant;
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

function allowed(claims: AdminClaims, key: string): boolean {
  return claims.sa === true || (claims.perms ?? []).includes(key);
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

function listUsers(
  res: ServerResponse,
  tenant: Tenant,
  query: URLSearchParams,
) {
  const search = query.get("search")?.trim().toLowerCase();
  const status = query.get("status");
  const membership = query.get("membership_status");
  const role = query.get("role");
  let users = tenant.users.filter(
    (user) =>
      (!search ||
        user.display_name.toLowerCase().includes(search) ||
        user.email === search) &&
      (!status || user.status === status) &&
      (!membership || user.membership_status === membership) &&
      (!role || user.roles.some((entry) => entry.id === role)),
  );
  const [field, direction] = (query.get("sort") ?? "created_at,DESC").split(
    ",",
  );
  const sign = direction === "ASC" ? 1 : -1;
  users = [...users].sort((a, b) => {
    const left = field === "display_name" ? a.display_name : a.created_at;
    const right = field === "display_name" ? b.display_name : b.created_at;
    return left.localeCompare(right) * sign;
  });
  json(res, 200, envelope(pageOf(users, query)));
}

async function invite(
  req: IncomingMessage,
  res: ServerResponse,
  tenant: Tenant,
): Promise<void> {
  const body = await readBody(req);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roleIds = Array.isArray(body.role_ids) ? body.role_ids : [];
  if (!email || roleIds.length === 0) {
    fail(res, 400, "ERR_VALIDATION");
    return;
  }
  const existing = tenant.users.find((user) => user.email === email);
  if (existing && existing.membership_status !== "invited") {
    fail(res, 409, "ERR_CONFLICT", "ALREADY_MEMBER");
    return;
  }
  if (!existing) {
    const name =
      typeof body.display_name === "string" && body.display_name
        ? body.display_name
        : (email.split("@")[0] ?? email);
    tenant.users.push({
      id: `00000000-0000-4000-8000-0000000d${String(tenant.nextId++).padStart(4, "0")}`,
      email,
      display_name: name,
      status: "pending",
      membership_status: "invited",
      roles: tenant.roles.filter((role) => roleIds.includes(role.id)).map(ref),
      created_at: new Date().toISOString(),
    });
  }
  json(res, 202, envelope({ status: "invited" }));
}

function listRoles(
  res: ServerResponse,
  tenant: Tenant,
  query: URLSearchParams,
) {
  const search = query.get("search")?.trim().toLowerCase();
  const roles = tenant.roles
    .filter((role) => !search || role.name.toLowerCase().includes(search))
    .map((role) => ({
      id: role.id,
      name: role.name,
      ...(role.description ? { description: role.description } : {}),
      is_system: role.is_system,
      permission_count: role.permissions.length,
      user_count: tenant.users.filter((user) =>
        user.roles.some((entry) => entry.id === role.id),
      ).length,
      version: role.version,
    }));
  json(res, 200, envelope(pageOf(roles, query)));
}

/**
 * Answers an admin request and returns true, or returns false for a path
 * this module does not serve.
 */
export function adminRoute(
  req: IncomingMessage,
  res: ServerResponse,
  claims: AdminClaims | undefined,
): boolean {
  const url = new URL(req.url ?? "/", "http://mock");
  const path = url.pathname;
  if (!path.startsWith("/v1/admin/")) {
    return false;
  }
  const route = `${req.method ?? "GET"} ${path}`;
  const routes: [RegExp, string, (tenant: Tenant) => void | Promise<void>][] = [
    [
      /^GET \/v1\/admin\/users$/,
      "users:read",
      (tenant) => {
        listUsers(res, tenant, url.searchParams);
      },
    ],
    [
      /^POST \/v1\/admin\/users\/invite$/,
      "users:manage",
      (tenant) => invite(req, res, tenant),
    ],
    [
      /^GET \/v1\/admin\/roles$/,
      "roles:manage",
      (tenant) => {
        listRoles(res, tenant, url.searchParams);
      },
    ],
  ];
  const match = routes.find(([pattern]) => pattern.test(route));
  if (!match) {
    return false;
  }
  if (!claims) {
    fail(res, 401, "ERR_UNAUTHORIZED");
    return true;
  }
  if (!allowed(claims, match[1])) {
    req.resume();
    fail(res, 403, "ERR_FORBIDDEN");
    return true;
  }
  void match[2](tenantOf(claims));
  return true;
}
