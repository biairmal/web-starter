// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleEditor } from "@/features/admin-roles/role-editor";
import { RoleTemplatesTable } from "@/features/admin-roles/role-templates-table";
import type { Me, Permission, RoleTemplate } from "@/lib/api/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

// Role templates (FE-52): the role editor with kind="template".

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const ADMIN_ID = "00000000-0000-4000-8000-00000000b001";
const SALES_ID = "00000000-0000-4000-8000-00000000b002";

const catalog: Permission[] = [
  { key: "notes:read", description: "Read notes", is_system: false },
  { key: "notes:write", description: "Write notes", is_system: false },
  { key: "users:read", description: "See users", is_system: true },
];

const adminTemplate: RoleTemplate = {
  id: ADMIN_ID,
  name: "admin",
  description: "Everything in the tenant",
  is_system: true,
  permissions: ["notes:read", "notes:write", "users:read"],
  version: 1,
};
const salesTemplate: RoleTemplate = {
  id: SALES_ID,
  name: "Sales",
  description: "Sells",
  is_system: false,
  permissions: ["notes:read"],
  version: 2,
};

const superAdmin: Me = { ...meFixture, is_super_admin: true };

const NOTICE =
  "Changes apply only to tenants created later. Existing tenants keep their current roles.";

function envelope(data: unknown) {
  return { timestamp: "2026-11-11T00:00:00Z", data };
}

function errorBody(status: number, reason?: string) {
  return HttpResponse.json(
    {
      error: {
        code: "ERR",
        message: "failed",
        ...(reason ? { meta: { reason } } : {}),
      },
    },
    { status },
  );
}

type Call = {
  method: string;
  path: string;
  ifMatch: string | null;
  body: unknown;
};

/** Templates that POST, PATCH and DELETE change, like identity. */
function serve(initial: RoleTemplate[] = [adminTemplate, salesTemplate]) {
  let templates = initial.map((template) => ({ ...template }));
  const calls: Call[] = [];
  let lists = 0;
  server.use(
    http.get("*/api/id/admin/permissions", () =>
      HttpResponse.json(envelope(catalog)),
    ),
    http.get("*/api/id/admin/role-templates", () => {
      lists += 1;
      return HttpResponse.json(envelope(templates));
    }),
    http.post("*/api/id/admin/role-templates", async ({ request }) => {
      const body = (await request.json()) as Partial<RoleTemplate>;
      calls.push({ method: "POST", path: "", ifMatch: null, body });
      const created: RoleTemplate = {
        id: "00000000-0000-4000-8000-00000000b0ff",
        name: body.name ?? "",
        is_system: false,
        permissions: body.permissions ?? [],
        version: 1,
        ...(body.description ? { description: body.description } : {}),
      };
      templates = [...templates, created];
      return HttpResponse.json(envelope(created), { status: 201 });
    }),
    http.patch(
      "*/api/id/admin/role-templates/:id",
      async ({ request, params }) => {
        const body = (await request.json()) as Partial<RoleTemplate>;
        calls.push({
          method: "PATCH",
          path: String(params.id),
          ifMatch: request.headers.get("if-match"),
          body,
        });
        const current = templates.find((entry) => entry.id === params.id);
        if (!current) {
          return errorBody(404);
        }
        const saved = { ...current, ...body, version: current.version + 1 };
        templates = templates.map((entry) =>
          entry.id === saved.id ? saved : entry,
        );
        return HttpResponse.json(envelope(saved));
      },
    ),
    http.delete("*/api/id/admin/role-templates/:id", ({ params }) => {
      calls.push({
        method: "DELETE",
        path: String(params.id),
        ifMatch: null,
        body: undefined,
      });
      templates = templates.filter((entry) => entry.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return {
    calls,
    lists: () => lists,
    changeElsewhere(id: string) {
      templates = templates.map((entry) =>
        entry.id === id ? { ...entry, version: entry.version + 1 } : entry,
      );
    },
  };
}

function renderEditor(id?: string) {
  return renderSignedIn(
    id === undefined ? (
      <RoleEditor kind="template" />
    ) : (
      <RoleEditor kind="template" id={id} />
    ),
    superAdmin,
    `/admin/role-templates/${id ?? "new"}`,
  );
}

beforeEach(() => {
  fakeRouter.reset("/admin/role-templates");
});

describe("RoleTemplatesTable", () => {
  it("FE-52 lists every template with its permission count and links into the editor", async () => {
    serve();
    renderSignedIn(<RoleTemplatesTable />, superAdmin);
    expect(await screen.findByText("2 templates")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Role templates" });
    const sales = within(table).getByRole("row", { name: /^Sales/ });
    expect(within(sales).getByRole("link", { name: "Sales" })).toHaveAttribute(
      "href",
      `/admin/role-templates/${SALES_ID}`,
    );
    expect(within(sales).getByText("1")).toBeInTheDocument();
    const admin = within(table).getByRole("row", { name: /^admin/ });
    expect(within(admin).getByText("System")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    serve([]);
    renderSignedIn(<RoleTemplatesTable />, superAdmin);
    expect(
      await screen.findByText("No role templates yet"),
    ).toBeInTheDocument();
  });
});

describe("RoleEditor for a template", () => {
  it("FE-52 says changes apply only to tenants created later, with the template's matrix", async () => {
    serve();
    renderEditor(SALES_ID);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sales" }),
    ).toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Role templates" }),
    ).toHaveAttribute("href", "/admin/role-templates");
    expect(screen.getByRole("checkbox", { name: "Read notes" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Write notes" })).toBeEnabled();
  });

  it("FE-52 saves name and keys in one PATCH with If-Match", async () => {
    const { calls } = serve();
    renderEditor(SALES_ID);
    const user = userEvent.setup();
    const name = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Sales team");
    await user.click(screen.getByRole("checkbox", { name: "Write notes" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(calls).toEqual([
      {
        method: "PATCH",
        path: SALES_ID,
        ifMatch: '"2"',
        body: {
          name: "Sales team",
          description: "Sells",
          permissions: ["notes:read", "notes:write"],
        },
      },
    ]);
    // The next save builds on the version this one returned.
    await user.click(screen.getByRole("checkbox", { name: "See users" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(calls).toHaveLength(2);
    });
    expect(calls[1]).toMatchObject({
      ifMatch: '"3"',
      body: { permissions: ["notes:read", "notes:write", "users:read"] },
    });
  });

  it("FE-52 a version conflict keeps the edits and Reload refetches the list", async () => {
    const state = serve();
    server.use(
      http.patch("*/api/id/admin/role-templates/:id", () =>
        errorBody(409, "VERSION_CONFLICT"),
      ),
    );
    renderEditor(SALES_ID);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("checkbox", { name: "Write notes" }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(/Someone else changed this/);
    expect(screen.getByRole("checkbox", { name: "Write notes" })).toBeChecked();
    const before = state.lists();
    await user.click(within(banner).getByRole("button", { name: "Reload" }));
    await waitFor(() => {
      expect(state.lists()).toBeGreaterThan(before);
    });
    await waitFor(() => {
      expect(
        screen.getByRole("checkbox", { name: "Write notes" }),
      ).not.toBeChecked();
    });
  });

  it("FE-52 creates a template with its keys and opens it", async () => {
    const { calls } = serve();
    fakeRouter.reset("/admin/role-templates/new");
    renderEditor();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "New role template",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Support");
    await user.click(screen.getByRole("checkbox", { name: "Read notes" }));
    await user.click(screen.getByRole("button", { name: "Create template" }));
    await waitFor(() => {
      expect(fakeRouter.url).toBe(
        "/admin/role-templates/00000000-0000-4000-8000-00000000b0ff",
      );
    });
    expect(calls).toEqual([
      {
        method: "POST",
        path: "",
        ifMatch: null,
        body: { name: "Support", permissions: ["notes:read"] },
      },
    ]);
    expect(
      await screen.findByText("Template “Support” created."),
    ).toBeInTheDocument();
  });

  it("FE-52 DUPLICATE shows on the name", async () => {
    serve();
    server.use(
      http.post("*/api/id/admin/role-templates", () =>
        errorBody(409, "DUPLICATE"),
      ),
    );
    renderEditor();
    const user = userEvent.setup();
    await user.type(
      await screen.findByRole("textbox", { name: "Name" }),
      "Sales",
    );
    await user.click(screen.getByRole("button", { name: "Create template" }));
    expect(
      await screen.findByText("A template with this name already exists."),
    ).toBeInTheDocument();
  });

  it("FE-52 deletes after a confirmation and goes back to the list", async () => {
    const { calls } = serve();
    renderEditor(SALES_ID);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Delete template" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Delete the “Sales” template?",
    });
    expect(
      within(dialog).getByText(/Existing tenants keep their copy\./),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Delete template" }),
    );
    await waitFor(() => {
      expect(fakeRouter.url).toBe("/admin/role-templates");
    });
    expect(calls).toEqual([
      { method: "DELETE", path: SALES_ID, ifMatch: null, body: undefined },
    ]);
    expect(
      await screen.findByText("Template “Sales” deleted."),
    ).toBeInTheDocument();
  });

  it("a system template is read-only with no Delete", async () => {
    serve();
    renderEditor(ADMIN_ID);
    expect(
      await screen.findByRole("heading", { level: 1, name: "admin" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Delete template" }),
    ).toBeNull();
  });

  it("a template that is not in the list shows the not-found state", async () => {
    serve();
    renderEditor("00000000-0000-4000-8000-00000000dead");
    expect(
      await screen.findByText("This template doesn’t exist"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to role templates" }),
    ).toHaveAttribute("href", "/admin/role-templates");
  });
});
