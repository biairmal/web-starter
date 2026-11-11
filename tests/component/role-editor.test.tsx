// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleEditor } from "@/features/admin-roles/role-editor";
import type { Me, Permission, Role } from "@/lib/api/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const ROLE_ID = "00000000-0000-4000-8000-000000000a02";

const catalog: Permission[] = [
  { key: "notes:read", description: "Read notes", is_system: false },
  { key: "notes:write", description: "Write notes", is_system: false },
  { key: "users:manage", description: "Change users", is_system: true },
  { key: "users:read", description: "See users", is_system: true },
];

const sales: Role = {
  id: ROLE_ID,
  name: "Sales",
  description: "Sells",
  is_system: false,
  permissions: ["notes:read"],
  version: 4,
};

/** Holds every key but users:manage. */
const admin: Me = {
  ...meFixture,
  permissions: ["roles:manage", "notes:read", "notes:write", "users:read"],
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

type Call = { method: string; ifMatch: string | null; body: unknown };

/** A role that each PATCH or PUT saves and moves to the next version. */
function serve(initial: Role = sales) {
  let role = { ...initial };
  const calls: Call[] = [];
  server.use(
    http.get("*/api/id/admin/permissions", () =>
      HttpResponse.json(envelope(catalog)),
    ),
    http.get("*/api/id/admin/roles/:id", () =>
      HttpResponse.json(envelope(role)),
    ),
    http.patch("*/api/id/admin/roles/:id", async ({ request }) => {
      const body = (await request.json()) as Partial<Role>;
      calls.push({
        method: "PATCH",
        ifMatch: request.headers.get("if-match"),
        body,
      });
      role = { ...role, ...body, version: role.version + 1 };
      return HttpResponse.json(envelope(role));
    }),
    http.put("*/api/id/admin/roles/:id/permissions", async ({ request }) => {
      const body = (await request.json()) as { permissions: string[] };
      calls.push({
        method: "PUT",
        ifMatch: request.headers.get("if-match"),
        body,
      });
      role = {
        ...role,
        permissions: body.permissions,
        version: role.version + 1,
      };
      return HttpResponse.json(envelope(role));
    }),
  );
  return {
    calls,
    /** Someone else saves in between. */
    changeElsewhere(next: Partial<Role>) {
      role = { ...role, ...next, version: role.version + 1 };
    },
  };
}

function render(me: Me = admin) {
  return renderSignedIn(
    <RoleEditor id={ROLE_ID} />,
    me,
    `/admin/roles/${ROLE_ID}`,
  );
}

function renderNew(me: Me = admin) {
  return renderSignedIn(<RoleEditor />, me, "/admin/roles/new");
}

beforeEach(() => {
  fakeRouter.reset(`/admin/roles/${ROLE_ID}`);
});

describe("RoleEditor", () => {
  it("FE-44 groups permissions by resource with a count per group", async () => {
    serve();
    render();
    const notes = await screen.findByRole("group", { name: "notes" });
    expect(within(notes).getByText("1 of 2 selected")).toBeInTheDocument();
    expect(
      within(notes).getByRole("checkbox", { name: "Read notes" }),
    ).toBeChecked();
    expect(within(notes).getByText("notes:write")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "users" })).toBeInTheDocument();
  });

  it("FE-44 disables unheld permissions with the reason", async () => {
    serve();
    render();
    const box = await screen.findByRole("checkbox", { name: "Change users" });
    expect(box).toBeDisabled();
    expect(box).toHaveAccessibleDescription(
      "You can’t grant a permission you don’t hold.",
    );
    expect(screen.getByRole("checkbox", { name: "See users" })).toBeEnabled();
  });

  it("FE-44 a key the role already grants stays editable without being held", async () => {
    serve({ ...sales, permissions: ["users:manage"] });
    render();
    const box = await screen.findByRole("checkbox", { name: "Change users" });
    expect(box).toBeChecked();
    expect(box).toBeEnabled();
  });

  it("FE-44 select all in a group skips the disabled keys", async () => {
    serve();
    render();
    const users = await screen.findByRole("group", { name: "users" });
    await userEvent
      .setup()
      .click(
        within(users).getByRole("checkbox", { name: "All users permissions" }),
      );
    expect(
      within(users).getByRole("checkbox", { name: "See users" }),
    ).toBeChecked();
    expect(
      within(users).getByRole("checkbox", { name: "Change users" }),
    ).not.toBeChecked();
  });

  it("FE-44 the matrix is keyboard operable: Tab moves, Space toggles", async () => {
    serve();
    render();
    const write = await screen.findByRole("checkbox", { name: "Write notes" });
    const user = userEvent.setup();
    write.focus();
    await user.keyboard(" ");
    expect(write).toBeChecked();
    await user.tab();
    expect(
      screen.getByRole("checkbox", { name: "All users permissions" }),
    ).toHaveFocus();
  });

  it("FE-44 saves name with PATCH and keys with PUT, each with If-Match", async () => {
    const { calls } = serve();
    render();
    const user = userEvent.setup();
    const name = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Sales team");
    await user.click(screen.getByRole("checkbox", { name: "Write notes" }));
    expect(
      screen.getByText("1 permission added, 0 removed"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(calls).toEqual([
      {
        method: "PATCH",
        ifMatch: '"4"',
        body: { name: "Sales team", description: "Sells" },
      },
      {
        method: "PUT",
        ifMatch: '"5"',
        body: { permissions: ["notes:read", "notes:write"] },
      },
    ]);
    // Saved: the bar goes away.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    });
  });

  it("FE-44 saves only the keys when only they changed", async () => {
    const { calls } = serve();
    render();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("checkbox", { name: "Read notes" }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Saved");
    expect(calls).toEqual([
      { method: "PUT", ifMatch: '"4"', body: { permissions: [] } },
    ]);
  });

  it("FE-45 VERSION_CONFLICT keeps the edits and shows the banner; Reload refetches", async () => {
    const mock = serve();
    server.use(
      http.put("*/api/id/admin/roles/:id/permissions", () =>
        errorBody(409, "VERSION_CONFLICT"),
      ),
    );
    render();
    const user = userEvent.setup();
    const write = await screen.findByRole("checkbox", { name: "Write notes" });
    await user.click(write);
    await user.click(screen.getByRole("button", { name: "Save" }));
    const banner = await screen.findByRole("alert");
    expect(banner).toHaveTextContent(
      "Someone else changed this. Reload to see their version.",
    );
    expect(write).toBeChecked();

    mock.changeElsewhere({ permissions: ["users:read"] });
    await user.click(within(banner).getByRole("button", { name: "Reload" }));
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "See users" })).toBeChecked();
    });
    expect(
      screen.getByRole("checkbox", { name: "Write notes" }),
    ).not.toBeChecked();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("FE-45 Copy my changes puts the diff on the clipboard", async () => {
    serve();
    server.use(
      http.put("*/api/id/admin/roles/:id/permissions", () =>
        errorBody(409, "VERSION_CONFLICT"),
      ),
    );
    render();
    // user-event puts a clipboard stub in place of the browser's.
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("checkbox", { name: "Write notes" }),
    );
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(
      await screen.findByRole("button", { name: "Copy my changes" }),
    );
    expect(await navigator.clipboard.readText()).toBe("+ notes:write");
  });

  it("FE-44 a rule from identity opens the dialog and keeps the edits", async () => {
    serve();
    server.use(
      http.put("*/api/id/admin/roles/:id/permissions", () =>
        errorBody(403, "SELF_ESCALATION"),
      ),
    );
    render();
    const user = userEvent.setup();
    const write = await screen.findByRole("checkbox", { name: "Write notes" });
    await user.click(write);
    await user.click(screen.getByRole("button", { name: "Save" }));
    const dialog = await screen.findByRole("dialog", {
      name: "The role wasn’t saved",
    });
    expect(
      within(dialog).getByText("You can’t give yourself more permissions."),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(write).toBeChecked();
  });

  it("FE-47 a system role is read-only with the reason and no save", async () => {
    serve({ ...sales, is_system: true, name: "Admin" });
    render();
    expect(
      await screen.findByText(
        /System role, managed by .+\. It can’t be edited\./,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
    for (const box of screen.getAllByRole("checkbox")) {
      expect(box).toBeDisabled();
    }
    expect(screen.queryByRole("button", { name: "Delete role" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("DUPLICATE on rename shows on the name field", async () => {
    serve();
    server.use(
      http.patch("*/api/id/admin/roles/:id", () => errorBody(409, "DUPLICATE")),
    );
    render();
    const user = userEvent.setup();
    const name = await screen.findByRole("textbox", { name: "Name" });
    await user.clear(name);
    await user.type(name, "Admin");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("A role with this name already exists."),
    ).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
  });

  it("Discard changes goes back to the saved role", async () => {
    serve();
    render();
    const user = userEvent.setup();
    const write = await screen.findByRole("checkbox", { name: "Write notes" });
    await user.click(write);
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(write).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("asks before leaving through a link with unsaved changes", async () => {
    serve();
    render();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("checkbox", { name: "Write notes" }),
    );
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const link = screen.getByRole("link", { name: "Roles" });
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(confirm).toHaveBeenCalledWith(
      "Leave this page? Your changes to this role aren’t saved.",
    );
    expect(click.defaultPrevented).toBe(true);
    confirm.mockRestore();
  });

  it("creates a role with its keys and opens it", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get("*/api/id/admin/permissions", () =>
        HttpResponse.json(envelope(catalog)),
      ),
      http.post("*/api/id/admin/roles", async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(
          envelope({ ...sales, id: "00000000-0000-4000-8000-000000000a09" }),
          { status: 201 },
        );
      }),
    );
    fakeRouter.reset("/admin/roles/new");
    renderNew();
    const user = userEvent.setup();
    expect(
      await screen.findByRole("heading", { level: 1, name: "New role" }),
    ).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Support");
    await user.click(screen.getByRole("checkbox", { name: "See users" }));
    await user.click(screen.getByRole("button", { name: "Create role" }));
    await waitFor(() => {
      expect(fakeRouter.url).toBe(
        "/admin/roles/00000000-0000-4000-8000-000000000a09",
      );
    });
    expect(bodies).toEqual([{ name: "Support", permissions: ["users:read"] }]);
  });
});
