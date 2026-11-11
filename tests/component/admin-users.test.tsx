// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InviteDialog } from "@/features/admin-users/invite-dialog";
import { UsersTable } from "@/features/admin-users/users-table";
import type { AdminUser, Me, RoleSummary } from "@/lib/api/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const ROLE_ADMIN = "00000000-0000-4000-8000-000000000a01";
const ROLE_SALES = "00000000-0000-4000-8000-000000000a02";

const roles: RoleSummary[] = [
  {
    id: ROLE_ADMIN,
    name: "Admin",
    description: "Everything",
    is_system: true,
    permission_count: 5,
    user_count: 1,
    version: 1,
  },
  {
    id: ROLE_SALES,
    name: "Sales",
    is_system: false,
    permission_count: 2,
    user_count: 3,
    version: 4,
  },
];

const users: AdminUser[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    email: "dina@example.test",
    display_name: "Dina Pratama",
    status: "active",
    membership_status: "active",
    roles: [
      { id: ROLE_ADMIN, name: "Admin" },
      { id: ROLE_SALES, name: "Sales" },
      { id: "00000000-0000-4000-8000-000000000003", name: "Support" },
    ],
    created_at: "2026-10-01T00:00:00Z",
    last_sign_in_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    email: "budi@example.test",
    display_name: "Budi",
    status: "pending",
    membership_status: "invited",
    roles: [{ id: ROLE_SALES, name: "Sales" }],
    created_at: "2026-11-09T00:00:00Z",
  },
];

const admin: Me = {
  ...meFixture,
  permissions: ["users:read", "users:manage", "roles:manage"],
};

function envelope(data: unknown) {
  return { timestamp: "2026-11-11T00:00:00Z", data };
}

function page(items: unknown[], total = items.length) {
  return envelope({
    items,
    total,
    page: 1,
    size: 25,
    total_pages: Math.max(1, Math.ceil(total / 25)),
    has_prev: false,
    has_next: total > 25,
  });
}

function errorBody(status: number, reason?: string, fields?: object) {
  return HttpResponse.json(
    {
      timestamp: "2026-11-11T00:00:00Z",
      error: {
        code: "ERR",
        message: "failed",
        ...(reason ? { meta: { reason, ...(fields ? { fields } : {}) } } : {}),
      },
    },
    { status, headers: { "X-Request-Id": "req-123" } },
  );
}

/** Answers the users list and records each request's query. */
function serveUsers(items: AdminUser[] = users) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("*/api/id/admin/users", ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(page(items));
    }),
    http.get("*/api/id/admin/roles", () => HttpResponse.json(page(roles))),
  );
  return queries;
}

beforeEach(() => {
  fakeRouter.reset("/admin/users");
});

describe("UsersTable", () => {
  it("FE-40 lists users with their roles, status and email", async () => {
    serveUsers();
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    await screen.findAllByRole("link", { name: "Dina Pratama" });
    const table = screen.getByRole("table", { name: "Users" });
    const dina = within(table)
      .getByRole("link", { name: "Dina Pratama" })
      .closest("tr");
    expect(dina).not.toBeNull();
    const row = within(dina as HTMLElement);
    expect(row.getByText("dina@example.test")).toBeInTheDocument();
    expect(row.getByText("Admin")).toBeInTheDocument();
    expect(row.getByText("+1")).toBeInTheDocument();
    expect(row.getByText("Active")).toBeInTheDocument();
    expect(
      within(table).getByRole("link", { name: "Dina Pratama" }),
    ).toHaveAttribute(
      "href",
      "/admin/users/00000000-0000-4000-8000-000000000101",
    );
    const budi = within(table)
      .getByRole("link", { name: "Budi" })
      .closest("tr");
    expect(
      within(budi as HTMLElement).getByText("Invited"),
    ).toBeInTheDocument();
    expect(within(budi as HTMLElement).getByText("Never")).toBeInTheDocument();
    expect(screen.getByText("2 users")).toBeInTheDocument();
  });

  it("FE-40 sends the filters and sort from the URL to identity", async () => {
    const queries = serveUsers();
    fakeRouter.reset(
      `/admin/users?page=2&sort=display_name%2CDESC&search=dina&status=active&membership_status=invited&role=${ROLE_SALES}`,
    );
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    await screen.findByRole("table", { name: "Users" });
    const query = queries.at(-1);
    expect(query?.get("page")).toBe("2");
    expect(query?.get("size")).toBe("25");
    expect(query?.getAll("sort")).toEqual(["display_name,DESC"]);
    expect(query?.get("search")).toBe("dina");
    expect(query?.get("status")).toBe("active");
    expect(query?.get("membership_status")).toBe("invited");
    expect(query?.get("role")).toBe(ROLE_SALES);
    expect(screen.getByRole("searchbox")).toHaveValue("dina");
    expect(screen.getByRole("button", { name: "Invited" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("FE-40 leaves out a filter value identity would refuse", async () => {
    const queries = serveUsers();
    fakeRouter.reset("/admin/users?status=bogus&sort=email%2CASC");
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    await screen.findByRole("table", { name: "Users" });
    expect(queries.at(-1)?.has("status")).toBe(false);
    expect(queries.at(-1)?.has("sort")).toBe(false);
  });

  it("FE-40 a membership tab and a sort change the URL and go back to page 1", async () => {
    serveUsers();
    fakeRouter.reset("/admin/users?page=3");
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Disabled" }));
    expect(fakeRouter.url).toBe("/admin/users?membership_status=disabled");

    await user.click(await screen.findByRole("button", { name: "Name" }));
    expect(fakeRouter.search.get("sort")).toBe("display_name,ASC");
    expect(fakeRouter.search.get("membership_status")).toBe("disabled");

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(fakeRouter.search.has("membership_status")).toBe(false);
  });

  it("FE-40 search waits for typing to stop, then replaces the URL", async () => {
    serveUsers();
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    await userEvent.setup().type(
      await screen.findByRole("searchbox", {
        name: "Search by name or exact email",
      }),
      "budi",
    );
    await waitFor(() => {
      expect(fakeRouter.search.get("search")).toBe("budi");
    });
    expect(fakeRouter.calls.at(-1)?.mode).toBe("replace");
  });

  it("hides the role filter from an admin who cannot list roles", async () => {
    let rolesAsked = false;
    serveUsers();
    server.use(
      http.get("*/api/id/admin/roles", () => {
        rolesAsked = true;
        return errorBody(403);
      }),
    );
    renderSignedIn(
      <UsersTable />,
      { ...meFixture, permissions: ["users:read"] },
      "/admin/users",
    );
    await screen.findByRole("table", { name: "Users" });
    expect(
      screen.getByRole("combobox", { name: "Account status" }),
    ).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "Role" })).toBeNull();
    expect(rolesAsked).toBe(false);
  });

  it("shows the first-run empty state without filters", async () => {
    serveUsers([]);
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    expect(await screen.findByText("No users yet")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows the no-match state with Clear filters", async () => {
    serveUsers([]);
    fakeRouter.reset("/admin/users?search=zzz&status=disabled");
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    expect(
      await screen.findByText("No users match these filters"),
    ).toBeInTheDocument();
    const clear = screen.getAllByRole("button", { name: "Clear filters" });
    await userEvent.setup().click(clear.at(-1) as HTMLElement);
    expect(fakeRouter.url).toBe("/admin/users");
  });

  it("shows the error state with the request ID and retries", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/id/admin/users", () => {
        calls += 1;
        return calls === 1 ? errorBody(400) : HttpResponse.json(page(users));
      }),
      http.get("*/api/id/admin/roles", () => HttpResponse.json(page(roles))),
    );
    renderSignedIn(<UsersTable />, admin, "/admin/users");
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Couldn’t load users.")).toBeInTheDocument();
    expect(within(alert).getByText(/req-123/)).toBeInTheDocument();
    await userEvent
      .setup()
      .click(within(alert).getByRole("button", { name: "Retry" }));
    expect(
      (await screen.findAllByRole("link", { name: "Dina Pratama" })).length,
    ).toBeGreaterThan(0);
  });
});

describe("InviteDialog", () => {
  async function openDialog() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invite user" }));
    const dialog = await screen.findByRole("dialog", { name: "Invite a user" });
    await within(dialog).findByRole("group", { name: "Roles" });
    return { user, dialog };
  }

  it("FE-41 requires at least one role", async () => {
    let posted = false;
    serveUsers();
    server.use(
      http.post("*/api/id/admin/users/invite", () => {
        posted = true;
        return HttpResponse.json(envelope({ status: "invited" }), {
          status: 202,
        });
      }),
    );
    renderSignedIn(<InviteDialog />, admin, "/admin/users");
    const { user, dialog } = await openDialog();
    await user.type(
      within(dialog).getByRole("textbox", { name: /Email/ }),
      "new@example.test",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Send invitation" }),
    );
    expect(
      await within(dialog).findByText("Choose at least one role."),
    ).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it("FE-41 sends the invite, closes and offers Resend", async () => {
    const bodies: unknown[] = [];
    serveUsers();
    server.use(
      http.post("*/api/id/admin/users/invite", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(envelope({ status: "invited" }), {
          status: 202,
        });
      }),
    );
    renderSignedIn(<InviteDialog />, admin, "/admin/users");
    const { user, dialog } = await openDialog();
    await user.type(
      within(dialog).getByRole("textbox", { name: /Email/ }),
      " new@example.test ",
    );
    await user.click(within(dialog).getByRole("checkbox", { name: "Sales" }));
    await user.click(
      within(dialog).getByRole("button", { name: "Send invitation" }),
    );
    expect(
      await screen.findByText("Invite sent to new@example.test"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(bodies).toEqual([
      { email: "new@example.test", role_ids: [ROLE_SALES] },
    ]);

    await user.click(screen.getByRole("button", { name: "Resend" }));
    expect(
      await screen.findByText("Invite sent to new@example.test again"),
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(2);
  });

  it("FE-41 sends the optional name when given", async () => {
    const bodies: unknown[] = [];
    serveUsers();
    server.use(
      http.post("*/api/id/admin/users/invite", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(envelope({ status: "invited" }), {
          status: 202,
        });
      }),
    );
    renderSignedIn(<InviteDialog />, admin, "/admin/users");
    const { user, dialog } = await openDialog();
    await user.type(
      within(dialog).getByRole("textbox", { name: /Email/ }),
      "new@example.test",
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: /Name/ }),
      "Nia",
    );
    await user.click(within(dialog).getByRole("checkbox", { name: "Admin" }));
    await user.click(within(dialog).getByRole("checkbox", { name: "Sales" }));
    await user.click(
      within(dialog).getByRole("button", { name: "Send invitation" }),
    );
    await waitFor(() => {
      expect(bodies).toHaveLength(1);
    });
    expect(bodies).toEqual([
      {
        email: "new@example.test",
        display_name: "Nia",
        role_ids: [ROLE_ADMIN, ROLE_SALES],
      },
    ]);
  });

  it("FE-41 an existing member is reported on the email field", async () => {
    serveUsers();
    server.use(
      http.post("*/api/id/admin/users/invite", () =>
        errorBody(409, "ALREADY_MEMBER"),
      ),
    );
    renderSignedIn(<InviteDialog />, admin, "/admin/users");
    const { user, dialog } = await openDialog();
    const email = within(dialog).getByRole("textbox", { name: /Email/ });
    await user.type(email, "dina@example.test");
    await user.click(within(dialog).getByRole("checkbox", { name: "Sales" }));
    await user.click(
      within(dialog).getByRole("button", { name: "Send invitation" }),
    );
    expect(
      await within(dialog).findByText("This person is already a member."),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("explains when the admin may not list roles", async () => {
    serveUsers();
    server.use(http.get("*/api/id/admin/roles", () => errorBody(403)));
    renderSignedIn(
      <InviteDialog />,
      { ...meFixture, permissions: ["users:read", "users:manage"] },
      "/admin/users",
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Invite user" }));
    expect(
      await screen.findByText(
        /Choosing roles needs permission to manage roles/,
      ),
    ).toBeInTheDocument();
  });
});
