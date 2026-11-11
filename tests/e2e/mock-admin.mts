import type { IncomingMessage, ServerResponse } from "node:http";

// The admin endpoints of the mock identity (tests/e2e/mock-identity.mts).
// Prism's random data cannot show a filter or a change take effect, so these
// answer from a small tenant kept per session ID (`sid`): every test signs in
// with its own session and sees a fresh copy of the seed.
//
// - GET /v1/admin/users: search (name contains, or the exact email), status,
//   membership_status, role, sort by display_name or created_at, paging.
// - POST /v1/admin/users/invite: 409 ALREADY_MEMBER for a member's email,
//   else 202 and an invited user.
// - GET /v1/admin/users/{id}; PUT …/roles; POST …/disable, …/enable and
//   …/revoke-sessions; DELETE. They keep identity's rules: SELF_ESCALATION
//   and SELF_ACTION on the caller's own account (`sub`), SUPER_ADMIN_PROTECTED
//   on Sari, LAST_ADMIN when no active member would keep roles:manage, and
//   PERMISSION_NOT_HELD for an added role granting what the caller does not hold.
// - GET /v1/admin/roles: paging and a name search. GET /v1/admin/roles/{id}.
// - POST /v1/admin/roles: DUPLICATE for a name in use. DELETE …/{id}:
//   SYSTEM_ROLE, ROLE_IN_USE without `force=true`, LAST_ADMIN.
//
// Each route answers 403 without its permission (`users:read`,
// `users:manage`, `roles:manage`), unless the token is the super admin's.

export type AdminClaims = {
  sub?: string;
  sid?: string;
  perms?: string[];
  sa?: boolean;
};

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
  /** The mock's super admin; identity does not say so in the payload. */
  super_admin?: boolean;
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

export const MOCK_USER_IDS = {
  dina: "00000000-0000-4000-8000-00000000b001",
  budi: "00000000-0000-4000-8000-00000000b002",
  citra: "00000000-0000-4000-8000-00000000b003",
  sari: "00000000-0000-4000-8000-00000000b004",
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
      id: MOCK_USER_IDS.dina,
      email: "dina@example.test",
      display_name: "Dina Pratama",
      status: "active",
      membership_status: "active",
      roles: [ref(admin)],
      created_at: "2026-09-01T08:00:00Z",
      last_sign_in_at: "2026-11-10T08:00:00Z",
    },
    {
      id: MOCK_USER_IDS.budi,
      email: "budi@example.test",
      display_name: "Budi Santoso",
      status: "pending",
      membership_status: "invited",
      roles: [ref(sales)],
      created_at: "2026-11-09T08:00:00Z",
    },
    {
      id: MOCK_USER_IDS.citra,
      email: "citra@example.test",
      display_name: "Citra Lestari",
      status: "active",
      membership_status: "disabled",
      roles: [ref(manager), ref(sales)],
      created_at: "2026-10-05T08:00:00Z",
      last_sign_in_at: "2026-10-20T08:00:00Z",
    },
    {
      id: MOCK_USER_IDS.sari,
      email: "sari@example.test",
      display_name: "Sari Wijaya",
      status: "active",
      membership_status: "active",
      roles: [ref(manager)],
      created_at: "2026-07-01T08:00:00Z",
      last_sign_in_at: "2026-11-11T08:00:00Z",
      super_admin: true,
    },
  ];
  // Enough members for a second page at 25 per page.
  const members = Array.from({ length: 26 }, (_, index): MockUser => {
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

function noContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
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

function listItem(user: MockUser) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    status: user.status,
    membership_status: user.membership_status,
    roles: user.roles,
    created_at: user.created_at,
    ...(user.last_sign_in_at ? { last_sign_in_at: user.last_sign_in_at } : {}),
  };
}

function detail(user: MockUser) {
  return {
    ...listItem(user),
    providers: {
      password: user.membership_status !== "invited",
      google: false,
    },
    version: 1,
  };
}

function listUsers(
  res: ServerResponse,
  tenant: Tenant,
  query: URLSearchParams,
): void {
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
  json(res, 200, envelope(pageOf(users.map(listItem), query)));
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

/** Whether an active member would still hold roles:manage. */
function keepsAdmin(users: MockUser[], roles: MockRole[]): boolean {
  return users.some(
    (user) =>
      user.status === "active" &&
      user.membership_status === "active" &&
      user.roles.some((entry) =>
        roles
          .find((role) => role.id === entry.id)
          ?.permissions.includes("roles:manage"),
      ),
  );
}

function findUser(
  res: ServerResponse,
  tenant: Tenant,
  id: string,
): MockUser | undefined {
  const user = tenant.users.find((entry) => entry.id === id);
  if (!user) {
    fail(res, 404, "ERR_NOT_FOUND");
  }
  return user;
}

/** The rules a change to a user passes first: the super admin, then yourself. */
function guard(
  res: ServerResponse,
  claims: AdminClaims,
  user: MockUser,
  selfReason: "SELF_ACTION" | "SELF_ESCALATION",
): boolean {
  if (user.super_admin && !claims.sa) {
    fail(res, 403, "ERR_FORBIDDEN", "SUPER_ADMIN_PROTECTED");
    return false;
  }
  if (claims.sub !== undefined && user.id === claims.sub) {
    fail(res, 403, "ERR_FORBIDDEN", selfReason);
    return false;
  }
  return true;
}

async function setRoles(
  req: IncomingMessage,
  res: ServerResponse,
  tenant: Tenant,
  claims: AdminClaims,
  id: string,
): Promise<void> {
  const body = await readBody(req);
  const user = findUser(res, tenant, id);
  if (!user || !guard(res, claims, user, "SELF_ESCALATION")) {
    return;
  }
  const ids = Array.isArray(body.role_ids) ? body.role_ids : [];
  const next = tenant.roles.filter((role) => ids.includes(role.id));
  if (
    next.some(
      (role) =>
        !user.roles.some((entry) => entry.id === role.id) &&
        role.permissions.some((key) => !allowed(claims, key)),
    )
  ) {
    fail(res, 403, "ERR_FORBIDDEN", "PERMISSION_NOT_HELD");
    return;
  }
  const changed = tenant.users.map((entry) =>
    entry.id === id ? { ...entry, roles: next.map(ref) } : entry,
  );
  if (!keepsAdmin(changed, tenant.roles)) {
    fail(res, 409, "ERR_CONFLICT", "LAST_ADMIN");
    return;
  }
  tenant.users = changed;
  json(res, 200, envelope({ roles: next.map(ref) }));
}

function changeMembership(
  res: ServerResponse,
  tenant: Tenant,
  claims: AdminClaims,
  id: string,
  action: "disable" | "enable" | "revoke" | "remove",
): void {
  const user = findUser(res, tenant, id);
  if (!user) {
    return;
  }
  if (action === "enable" || action === "revoke") {
    if (action === "enable" && user.membership_status === "disabled") {
      user.membership_status = "active";
    }
    noContent(res);
    return;
  }
  if (!guard(res, claims, user, "SELF_ACTION")) {
    return;
  }
  const changed =
    action === "remove"
      ? tenant.users.filter((entry) => entry.id !== id)
      : tenant.users.map((entry) =>
          entry.id === id
            ? { ...entry, membership_status: "disabled" as const }
            : entry,
        );
  if (!keepsAdmin(changed, tenant.roles)) {
    fail(res, 409, "ERR_CONFLICT", "LAST_ADMIN");
    return;
  }
  tenant.users = changed;
  noContent(res);
}

function listRoles(
  res: ServerResponse,
  tenant: Tenant,
  query: URLSearchParams,
): void {
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

function getRole(res: ServerResponse, tenant: Tenant, id: string): void {
  const role = tenant.roles.find((entry) => entry.id === id);
  if (!role) {
    fail(res, 404, "ERR_NOT_FOUND");
    return;
  }
  json(res, 200, envelope(role));
}

async function createRole(
  req: IncomingMessage,
  res: ServerResponse,
  tenant: Tenant,
): Promise<void> {
  const body = await readBody(req);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 50) {
    fail(res, 400, "ERR_VALIDATION");
    return;
  }
  if (
    tenant.roles.some((role) => role.name.toLowerCase() === name.toLowerCase())
  ) {
    fail(res, 409, "ERR_CONFLICT", "DUPLICATE");
    return;
  }
  const role: MockRole = {
    id: `00000000-0000-4000-8000-0000000e${String(tenant.nextId++).padStart(4, "0")}`,
    name,
    ...(typeof body.description === "string" && body.description
      ? { description: body.description }
      : {}),
    is_system: false,
    permissions: [],
    version: 1,
  };
  tenant.roles.push(role);
  json(res, 201, envelope(role));
}

/** DELETE /v1/admin/roles/{id}?force: SYSTEM_ROLE, ROLE_IN_USE, LAST_ADMIN. */
function deleteRole(
  res: ServerResponse,
  tenant: Tenant,
  id: string,
  force: boolean,
): void {
  const role = tenant.roles.find((entry) => entry.id === id);
  if (!role) {
    fail(res, 404, "ERR_NOT_FOUND");
    return;
  }
  if (role.is_system) {
    fail(res, 409, "ERR_CONFLICT", "SYSTEM_ROLE");
    return;
  }
  const holders = tenant.users.filter((user) =>
    user.roles.some((entry) => entry.id === id),
  );
  if (holders.length > 0 && !force) {
    fail(res, 409, "ERR_CONFLICT", "ROLE_IN_USE");
    return;
  }
  const roles = tenant.roles.filter((entry) => entry.id !== id);
  const users = tenant.users.map((user) => ({
    ...user,
    roles: user.roles.filter((entry) => entry.id !== id),
  }));
  if (!keepsAdmin(users, roles)) {
    fail(res, 409, "ERR_CONFLICT", "LAST_ADMIN");
    return;
  }
  tenant.roles = roles;
  tenant.users = users;
  noContent(res);
}

type Handler = (
  tenant: Tenant,
  claims: AdminClaims,
  id: string,
) => void | Promise<void>;

/** `METHOD path` patterns, the permission each needs, and the handler. */
function routes(
  req: IncomingMessage,
  res: ServerResponse,
  query: URLSearchParams,
): [RegExp, string, Handler][] {
  return [
    [
      /^GET \/v1\/admin\/users$/,
      "users:read",
      (tenant) => {
        listUsers(res, tenant, query);
      },
    ],
    [
      /^POST \/v1\/admin\/users\/invite$/,
      "users:manage",
      (tenant) => invite(req, res, tenant),
    ],
    [
      /^GET \/v1\/admin\/users\/[^/]+$/,
      "users:read",
      (tenant, _claims, id) => {
        const user = findUser(res, tenant, id);
        if (user) {
          json(res, 200, envelope(detail(user)));
        }
      },
    ],
    [
      /^PUT \/v1\/admin\/users\/[^/]+\/roles$/,
      "users:manage",
      (tenant, claims, id) => setRoles(req, res, tenant, claims, id),
    ],
    [
      /^POST \/v1\/admin\/users\/[^/]+\/disable$/,
      "users:manage",
      (tenant, claims, id) => {
        changeMembership(res, tenant, claims, id, "disable");
      },
    ],
    [
      /^POST \/v1\/admin\/users\/[^/]+\/enable$/,
      "users:manage",
      (tenant, claims, id) => {
        changeMembership(res, tenant, claims, id, "enable");
      },
    ],
    [
      /^POST \/v1\/admin\/users\/[^/]+\/revoke-sessions$/,
      "users:manage",
      (tenant, claims, id) => {
        changeMembership(res, tenant, claims, id, "revoke");
      },
    ],
    [
      /^DELETE \/v1\/admin\/users\/[^/]+$/,
      "users:manage",
      (tenant, claims, id) => {
        changeMembership(res, tenant, claims, id, "remove");
      },
    ],
    [
      /^GET \/v1\/admin\/roles$/,
      "roles:manage",
      (tenant) => {
        listRoles(res, tenant, query);
      },
    ],
    [
      /^POST \/v1\/admin\/roles$/,
      "roles:manage",
      (tenant) => createRole(req, res, tenant),
    ],
    [
      /^DELETE \/v1\/admin\/roles\/[^/]+$/,
      "roles:manage",
      (tenant, _claims, id) => {
        deleteRole(res, tenant, id, query.get("force") === "true");
      },
    ],
    [
      /^GET \/v1\/admin\/roles\/[^/]+$/,
      "roles:manage",
      (tenant, _claims, id) => {
        getRole(res, tenant, id);
      },
    ],
  ];
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
  const match = routes(req, res, url.searchParams).find(([pattern]) =>
    pattern.test(route),
  );
  if (!match) {
    return false;
  }
  if (!claims) {
    req.resume();
    fail(res, 401, "ERR_UNAUTHORIZED");
    return true;
  }
  if (!allowed(claims, match[1])) {
    req.resume();
    fail(res, 403, "ERR_FORBIDDEN");
    return true;
  }
  // /v1/admin/<resource>/<id>/…
  const id = decodeURIComponent(path.split("/")[4] ?? "");
  void match[2](tenantOf(claims), claims, id);
  return true;
}
