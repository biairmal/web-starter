// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserDetail } from "@/features/admin-users/user-detail";
import type { AdminUserDetail, Me, Role, RoleSummary } from "@/lib/api/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const USER_ID = "00000000-0000-4000-8000-000000000101";
const ADMIN_ROLE = "00000000-0000-4000-8000-000000000a01";
const SALES_ROLE = "00000000-0000-4000-8000-000000000a02";

const roleDetails: Role[] = [
  {
    id: ADMIN_ROLE,
    name: "Admin",
    is_system: true,
    permissions: ["users:read", "users:manage", "roles:manage"],
    version: 1,
  },
  {
    id: SALES_ROLE,
    name: "Sales",
    is_system: false,
    permissions: ["notes:read"],
    version: 2,
  },
];

const roleSummaries: RoleSummary[] = roleDetails.map((role) => ({
  id: role.id,
  name: role.name,
  is_system: role.is_system,
  permission_count: role.permissions.length,
  user_count: 1,
  version: role.version,
}));

const dina: AdminUserDetail = {
  id: USER_ID,
  email: "dina@example.test",
  display_name: "Dina Pratama",
  status: "active",
  membership_status: "active",
  roles: [{ id: SALES_ROLE, name: "Sales" }],
  created_at: "2026-10-01T00:00:00Z",
  last_sign_in_at: "2026-11-10T00:00:00Z",
  providers: { password: true, google: true },
  version: 3,
};

/** Holds every permission of both roles, so nothing is disabled. */
const admin: Me = {
  ...meFixture,
  permissions: ["users:read", "users:manage", "roles:manage", "notes:read"],
};

function envelope(data: unknown) {
  return { timestamp: "2026-11-11T00:00:00Z", data };
}

function errorBody(status: number, reason?: string) {
  return HttpResponse.json(
    {
      timestamp: "2026-11-11T00:00:00Z",
      error: {
        code: "ERR",
        message: "failed",
        ...(reason ? { meta: { reason } } : {}),
      },
    },
    { status },
  );
}

type Calls = { method: string; path: string; body?: unknown }[];

function serve(user: AdminUserDetail = dina): Calls {
  const calls: Calls = [];
  server.use(
    http.get("*/api/id/admin/users/:id", () =>
      HttpResponse.json(envelope(user)),
    ),
    http.get("*/api/id/admin/roles", () =>
      HttpResponse.json(
        envelope({
          items: roleSummaries,
          total: 2,
          page: 1,
          size: 100,
          total_pages: 1,
          has_prev: false,
          has_next: false,
        }),
      ),
    ),
    http.get("*/api/id/admin/roles/:id", ({ params }) =>
      HttpResponse.json(
        envelope(roleDetails.find((role) => role.id === params.id)),
      ),
    ),
    http.put("*/api/id/admin/users/:id/roles", async ({ request }) => {
      calls.push({
        method: "PUT",
        path: new URL(request.url).pathname,
        body: await request.json(),
      });
      return HttpResponse.json(envelope({ roles: [] }));
    }),
    http.post("*/api/id/admin/users/:id/:action", ({ request }) => {
      calls.push({ method: "POST", path: new URL(request.url).pathname });
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete("*/api/id/admin/users/:id", ({ request }) => {
      calls.push({ method: "DELETE", path: new URL(request.url).pathname });
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return calls;
}

function render(me: Me = admin) {
  return renderSignedIn(
    <UserDetail id={USER_ID} />,
    me,
    `/admin/users/${USER_ID}`,
  );
}

beforeEach(() => {
  fakeRouter.reset(`/admin/users/${USER_ID}`);
});

describe("UserDetail", () => {
  it("FE-42 shows the profile, membership and roles", async () => {
    serve();
    render();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Dina Pratama" }),
    ).toBeInTheDocument();
    const profile = screen.getByRole("region", { name: "Profile" });
    expect(within(profile).getByText("dina@example.test")).toBeInTheDocument();
    expect(within(profile).getByText("Password, Google")).toBeInTheDocument();
    const roles = screen.getByRole("region", { name: "Roles" });
    expect(within(roles).getByText("Sales")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent("Users");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/admin/users",
    );
  });

  it("FE-42 saves the full role list and offers Revoke sessions now", async () => {
    const calls = serve();
    render();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Edit roles" }));
    const group = await screen.findByRole("group", {
      name: "Roles in this workspace",
    });
    await user.click(within(group).getByRole("checkbox", { name: "Admin" }));
    await user.click(screen.getByRole("button", { name: "Save roles" }));
    expect(
      await screen.findByText(
        "Roles updated. Dina Pratama sees the change within 15 minutes.",
      ),
    ).toBeInTheDocument();
    expect(calls[0]).toEqual({
      method: "PUT",
      path: `/api/id/admin/users/${USER_ID}/roles`,
      body: { role_ids: [ADMIN_ROLE, SALES_ROLE] },
    });
    // No If-Match: the endpoint replaces the full list (TRD 8.5).
    await user.click(
      screen.getByRole("button", { name: "Revoke sessions now" }),
    );
    await waitFor(() => {
      expect(calls[1]).toEqual({
        method: "POST",
        path: `/api/id/admin/users/${USER_ID}/revoke-sessions`,
      });
    });
    expect(
      await screen.findByText("Dina Pratama was signed out everywhere."),
    ).toBeInTheDocument();
  });

  it("FE-44 disables a role that grants a permission the admin does not hold", async () => {
    serve({ ...dina, roles: [] });
    render({
      ...meFixture,
      permissions: ["users:read", "users:manage", "roles:manage"],
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Edit roles" }));
    const sales = await screen.findByRole("checkbox", { name: "Sales" });
    await waitFor(() => {
      expect(sales).toBeDisabled();
    });
    expect(sales).toHaveAccessibleDescription(
      "Grants a permission you don’t hold, so you can’t assign it.",
    );
    expect(screen.getByRole("checkbox", { name: "Admin" })).toBeEnabled();
  });

  it("FE-44 a role the user already has can still be taken away", async () => {
    serve();
    render({
      ...meFixture,
      permissions: ["users:read", "users:manage", "roles:manage"],
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Edit roles" }));
    const sales = await screen.findByRole("checkbox", { name: "Sales" });
    // Wait for the role permissions, which would disable an unassigned role.
    await screen.findByRole("checkbox", { name: "Admin" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sales).toBeChecked();
    expect(sales).toBeEnabled();
    await user.click(sales);
    expect(sales).not.toBeChecked();
  });

  it("FE-42 a rule from identity on save opens a dialog and keeps the edits", async () => {
    serve();
    server.use(
      http.put("*/api/id/admin/users/:id/roles", () =>
        errorBody(409, "LAST_ADMIN"),
      ),
    );
    render();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Edit roles" }));
    const sales = await screen.findByRole("checkbox", { name: "Sales" });
    await user.click(sales);
    await user.click(screen.getByRole("button", { name: "Save roles" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Roles weren’t saved",
    });
    expect(
      within(dialog).getByText("This tenant needs at least one admin."),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.getByRole("checkbox", { name: "Sales" })).not.toBeChecked();
  });

  it("FE-47 the admin's own account is read-only with the reason", async () => {
    serve();
    render({ ...admin, id: USER_ID });
    expect(
      await screen.findByText(
        "This is your account. Another admin has to change your roles.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit roles" })).toBeNull();
    expect(
      screen.getByText(
        "This is your account. You can’t disable or remove yourself here.",
      ),
    ).toBeInTheDocument();
    for (const name of [
      "Disable",
      "Revoke sessions",
      "Remove from workspace",
    ]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("FE-42 disable confirms first, then calls identity", async () => {
    const calls = serve();
    render();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Disable" }));
    const dialog = await screen.findByRole("dialog", {
      name: "Disable Dina Pratama?",
    });
    expect(calls).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Disable" }));
    expect(
      await screen.findByText("Dina Pratama was disabled."),
    ).toBeInTheDocument();
    expect(calls).toEqual([
      { method: "POST", path: `/api/id/admin/users/${USER_ID}/disable` },
    ]);
  });

  it("FE-42 a disabled member offers Enable instead", async () => {
    serve({ ...dina, membership_status: "disabled" });
    render();
    expect(await screen.findByRole("button", { name: "Enable" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Disable" })).toBeNull();
  });

  it("FE-42 shows LAST_ADMIN in the confirmation", async () => {
    serve();
    server.use(
      http.post("*/api/id/admin/users/:id/disable", () =>
        errorBody(409, "LAST_ADMIN"),
      ),
    );
    render();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Disable" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Disable" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "This tenant needs at least one admin.",
    );
  });

  it("FE-42 shows SUPER_ADMIN_PROTECTED in the confirmation", async () => {
    serve();
    server.use(
      http.delete("*/api/id/admin/users/:id", () =>
        errorBody(403, "SUPER_ADMIN_PROTECTED"),
      ),
    );
    render();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Remove from workspace" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Remove from workspace" }),
    );
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The super admin can’t be changed.",
    );
  });

  it("FE-42 remove goes back to the users list", async () => {
    const calls = serve();
    render();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Remove from workspace" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Remove Dina Pratama from this workspace?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Remove from workspace" }),
    );
    await waitFor(() => {
      expect(fakeRouter.url).toBe("/admin/users");
    });
    expect(calls).toEqual([
      { method: "DELETE", path: `/api/id/admin/users/${USER_ID}` },
    ]);
  });

  it("without users:manage there are no changes to make", async () => {
    serve();
    render({ ...meFixture, permissions: ["users:read"] });
    await screen.findByRole("heading", { level: 1, name: "Dina Pratama" });
    expect(screen.queryByRole("button", { name: "Edit roles" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Danger zone" })).toBeNull();
  });

  it("a user not in the tenant shows the not-found state", async () => {
    server.use(http.get("*/api/id/admin/users/:id", () => errorBody(404)));
    render();
    expect(
      await screen.findByText("This user isn’t in this workspace"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to users" })).toHaveAttribute(
      "href",
      "/admin/users",
    );
  });
});
