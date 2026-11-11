// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateRoleDialog } from "@/features/admin-roles/create-role-dialog";
import { RolesTable } from "@/features/admin-roles/roles-table";
import type { Me, RoleSummary } from "@/lib/api/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const roles: RoleSummary[] = [
  {
    id: "00000000-0000-4000-8000-000000000a01",
    name: "Admin",
    description: "Everything",
    is_system: true,
    permission_count: 5,
    user_count: 1,
    version: 1,
  },
  {
    id: "00000000-0000-4000-8000-000000000a02",
    name: "Sales",
    is_system: false,
    permission_count: 2,
    user_count: 3,
    version: 4,
  },
  {
    id: "00000000-0000-4000-8000-000000000a03",
    name: "Unused",
    is_system: false,
    permission_count: 0,
    user_count: 0,
    version: 1,
  },
];

const admin: Me = { ...meFixture, permissions: ["roles:manage"] };

function envelope(data: unknown) {
  return { timestamp: "2026-11-11T00:00:00Z", data };
}

function page(items: unknown[]) {
  return envelope({
    items,
    total: items.length,
    page: 1,
    size: 25,
    total_pages: 1,
    has_prev: false,
    has_next: false,
  });
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

function serveRoles(items: RoleSummary[] = roles) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("*/api/id/admin/roles", ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(page(items));
    }),
  );
  return queries;
}

function rowOf(name: string): HTMLElement {
  const link = within(screen.getByRole("table", { name: "Roles" })).getByRole(
    "link",
    { name },
  );
  return link.closest("tr") as HTMLElement;
}

async function openDelete(name: string) {
  const user = userEvent.setup();
  await screen.findAllByRole("link", { name });
  await user.click(
    within(rowOf(name)).getByRole("button", { name: `Actions for ${name}` }),
  );
  await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
  return user;
}

beforeEach(() => {
  fakeRouter.reset("/admin/roles");
});

describe("RolesTable", () => {
  it("FE-43 lists roles with counts and the System chip", async () => {
    serveRoles();
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    await screen.findAllByRole("link", { name: "Sales" });
    const system = within(rowOf("Admin"));
    expect(system.getByText("System")).toBeInTheDocument();
    const sales = within(rowOf("Sales"));
    expect(sales.getByText("3")).toBeInTheDocument();
    expect(sales.getByText("2")).toBeInTheDocument();
    expect(sales.queryByText("System")).toBeNull();
    // A zero is printed, not hidden.
    expect(within(rowOf("Unused")).getAllByText("0")).toHaveLength(2);
    expect(
      within(rowOf("Sales")).getByRole("link", { name: "Sales" }),
    ).toHaveAttribute(
      "href",
      "/admin/roles/00000000-0000-4000-8000-000000000a02",
    );
  });

  it("FE-43 a system role offers no Delete", async () => {
    serveRoles();
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    await screen.findAllByRole("link", { name: "Admin" });
    const user = userEvent.setup();
    await user.click(
      within(rowOf("Admin")).getByRole("button", { name: "Actions for Admin" }),
    );
    expect(await screen.findByRole("menuitem", { name: "View" })).toBeVisible();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
  });

  it("sends the search from the URL", async () => {
    const queries = serveRoles();
    fakeRouter.reset("/admin/roles?search=sal");
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    await screen.findAllByRole("link", { name: "Sales" });
    expect(queries.at(-1)?.get("search")).toBe("sal");
    expect(screen.getByRole("searchbox", { name: "Search roles" })).toHaveValue(
      "sal",
    );
  });

  it("FE-43 deletes an unassigned role after one confirmation", async () => {
    const deleted: string[] = [];
    serveRoles();
    server.use(
      http.delete("*/api/id/admin/roles/:id", ({ request }) => {
        deleted.push(
          new URL(request.url).pathname + new URL(request.url).search,
        );
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    const user = await openDelete("Unused");
    const dialog = await screen.findByRole("dialog", {
      name: "Delete the role “Unused”?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Delete role" }),
    );
    expect(
      await screen.findByText("Role “Unused” deleted."),
    ).toBeInTheDocument();
    expect(deleted).toEqual([
      "/api/id/admin/roles/00000000-0000-4000-8000-000000000a03",
    ]);
  });

  it("FE-43 ROLE_IN_USE asks again with the count and the typed name, then forces", async () => {
    const deleted: string[] = [];
    serveRoles();
    server.use(
      http.delete("*/api/id/admin/roles/:id", ({ request }) => {
        const url = new URL(request.url);
        deleted.push(url.search);
        return url.searchParams.get("force") === "true"
          ? new HttpResponse(null, { status: 204 })
          : errorBody(409, "ROLE_IN_USE");
      }),
    );
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    const user = await openDelete("Sales");
    let dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete role" }),
    );
    dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByText(
        "3 users have this role. They lose everything it grants.",
      ),
    ).toBeInTheDocument();
    const force = within(dialog).getByRole("button", { name: "Delete anyway" });
    expect(force).toBeDisabled();
    await user.type(within(dialog).getByRole("textbox"), "Sales");
    await user.click(force);
    expect(
      await screen.findByText("Role “Sales” deleted."),
    ).toBeInTheDocument();
    expect(deleted).toEqual(["", "?force=true"]);
  });

  it("FE-43 LAST_ADMIN closes the confirmation and explains the rule", async () => {
    serveRoles();
    server.use(
      http.delete("*/api/id/admin/roles/:id", () =>
        errorBody(409, "LAST_ADMIN"),
      ),
    );
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    const user = await openDelete("Unused");
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Delete role",
      }),
    );
    const rule = await screen.findByRole("dialog", {
      name: "The role wasn’t deleted",
    });
    expect(
      within(rule).getByText("This tenant needs at least one admin."),
    ).toBeInTheDocument();
  });

  it("FE-43 SYSTEM_ROLE from identity explains the rule", async () => {
    serveRoles();
    server.use(
      http.delete("*/api/id/admin/roles/:id", () =>
        errorBody(409, "SYSTEM_ROLE"),
      ),
    );
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    const user = await openDelete("Unused");
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Delete role",
      }),
    );
    const rule = await screen.findByRole("dialog", {
      name: "The role wasn’t deleted",
    });
    expect(
      within(rule).getByText(/System role, managed by/),
    ).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    serveRoles([]);
    renderSignedIn(<RolesTable />, admin, "/admin/roles");
    expect(await screen.findByText("No roles yet")).toBeInTheDocument();
  });
});

describe("CreateRoleDialog", () => {
  async function open() {
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create role" }));
    const dialog = await screen.findByRole("dialog", { name: "Create a role" });
    return { user, dialog };
  }

  it("FE-43 validates the name length", async () => {
    let posted = false;
    server.use(
      http.post("*/api/id/admin/roles", () => {
        posted = true;
        return HttpResponse.json(envelope({}), { status: 201 });
      }),
    );
    renderSignedIn(<CreateRoleDialog />, admin, "/admin/roles");
    const { user, dialog } = await open();
    await user.click(
      within(dialog).getByRole("button", { name: "Create role" }),
    );
    expect(
      await within(dialog).findByText("Enter a name."),
    ).toBeInTheDocument();
    await user.type(
      within(dialog).getByRole("textbox", { name: /Name/ }),
      "x".repeat(51),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Create role" }),
    );
    expect(
      await within(dialog).findByText("Use 50 characters or fewer."),
    ).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it("FE-43 creates the role and closes", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post("*/api/id/admin/roles", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          envelope({
            id: "00000000-0000-4000-8000-000000000a09",
            name: "Support",
            is_system: false,
            permissions: [],
            version: 1,
          }),
          { status: 201 },
        );
      }),
    );
    renderSignedIn(<CreateRoleDialog />, admin, "/admin/roles");
    const { user, dialog } = await open();
    await user.type(
      within(dialog).getByRole("textbox", { name: /Name/ }),
      " Support ",
    );
    await user.type(
      within(dialog).getByRole("textbox", { name: /Description/ }),
      "Answers tickets",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Create role" }),
    );
    expect(
      await screen.findByText(
        "Role “Support” created. Open it to choose its permissions.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(bodies).toEqual([
      { name: "Support", description: "Answers tickets" },
    ]);
  });

  it("FE-43 DUPLICATE shows on the name field", async () => {
    server.use(
      http.post("*/api/id/admin/roles", () => errorBody(409, "DUPLICATE")),
    );
    renderSignedIn(<CreateRoleDialog />, admin, "/admin/roles");
    const { user, dialog } = await open();
    const name = within(dialog).getByRole("textbox", { name: /Name/ });
    await user.type(name, "Sales");
    await user.click(
      within(dialog).getByRole("button", { name: "Create role" }),
    );
    expect(
      await within(dialog).findByText("A role with this name already exists."),
    ).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
  });
});
