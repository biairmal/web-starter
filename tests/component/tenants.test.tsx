// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me, Tenant } from "@/lib/api/types";
import { CreateTenantDialog } from "@/features/tenants/create-tenant-dialog";
import { TenantDetail } from "@/features/tenants/tenant-detail";
import { TenantsTable } from "@/features/tenants/tenants-table";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const switchTenant = vi.fn<(id: string) => Promise<void>>();
vi.mock("@/lib/switch-tenant", () => ({
  switchTenant: (id: string) => switchTenant(id),
}));

const superAdmin: Me = { ...meFixture, is_super_admin: true };

const acme: Tenant = {
  id: "00000000-0000-4000-8000-0000000000a1",
  slug: "acme",
  name: "Acme",
  status: "active",
  member_count: 12,
  created_at: "2026-10-01T00:00:00Z",
  version: 3,
};
const globex: Tenant = {
  id: "00000000-0000-4000-8000-0000000000a2",
  slug: "globex",
  name: "Globex",
  status: "suspended",
  member_count: 1,
  created_at: "2026-10-02T00:00:00Z",
  version: 7,
};
const home: Tenant = {
  id: meFixture.tenant.id,
  slug: "default",
  name: "Default",
  status: "active",
  member_count: 2,
  created_at: "2026-09-01T00:00:00Z",
  version: 1,
};

function page(items: Tenant[]) {
  return {
    data: { items, page: 1, size: 25, total: items.length, total_pages: 1 },
  };
}

function errorBody(status: number, reason?: string) {
  return HttpResponse.json(
    {
      error: {
        code: "ERR",
        message: "x",
        ...(reason ? { meta: { reason } } : {}),
      },
    },
    { status },
  );
}

function serveTenant(tenant: Tenant) {
  server.use(
    http.get("*/api/id/admin/tenants/:id", () =>
      HttpResponse.json({ data: tenant }),
    ),
  );
}

describe("TenantsTable", () => {
  beforeEach(() => {
    fakeRouter.reset("/admin/tenants");
  });

  it("FE-50 lists tenants with slug, status, users and a link to each", async () => {
    server.use(
      http.get("*/api/id/admin/tenants", () =>
        HttpResponse.json(page([acme, globex])),
      ),
    );
    renderSignedIn(<TenantsTable />, superAdmin, "/admin/tenants");
    expect(await screen.findByText("2 tenants")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Tenants" });
    const acmeRow = within(table).getByRole("row", { name: /^Acme/ });
    const globexRow = within(table).getByRole("row", { name: /^Globex/ });
    expect(within(acmeRow).getByRole("link", { name: "Acme" })).toHaveAttribute(
      "href",
      `/admin/tenants/${acme.id}`,
    );
    expect(within(acmeRow).getByText("acme")).toBeInTheDocument();
    expect(within(acmeRow).getByText("12")).toBeInTheDocument();
    expect(within(globexRow).getByText("Suspended")).toBeInTheDocument();
  });

  it("FE-50 status tab and search live in the URL and go to the API", async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get("*/api/id/admin/tenants", ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([globex]));
      }),
    );
    renderSignedIn(<TenantsTable />, superAdmin, "/admin/tenants");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Suspended" }));
    expect(fakeRouter.url).toBe("/admin/tenants?status=suspended");
    await user.type(screen.getByLabelText("Search by name or slug"), "glo");
    await waitFor(() => {
      expect(fakeRouter.url).toBe("/admin/tenants?search=glo&status=suspended");
    });
    await waitFor(() => {
      const last = seen.at(-1);
      expect(last?.get("status")).toBe("suspended");
      expect(last?.get("search")).toBe("glo");
    });
  });

  it("a status in the URL selects its tab after a reload", async () => {
    fakeRouter.reset("/admin/tenants?status=active");
    let status: string | null = null;
    server.use(
      http.get("*/api/id/admin/tenants", ({ request }) => {
        status = new URL(request.url).searchParams.get("status");
        return HttpResponse.json(page([acme]));
      }),
    );
    renderSignedIn(<TenantsTable />, superAdmin, "/admin/tenants");
    expect(
      await screen.findByRole("button", { name: "Active" }),
    ).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => {
      expect(status).toBe("active");
    });
  });

  it("shows the no-match state with Clear filters", async () => {
    fakeRouter.reset("/admin/tenants?search=zzz");
    server.use(
      http.get("*/api/id/admin/tenants", () => HttpResponse.json(page([]))),
    );
    renderSignedIn(<TenantsTable />, superAdmin, "/admin/tenants");
    expect(
      await screen.findByText("No tenants match these filters"),
    ).toBeInTheDocument();
  });
});

describe("CreateTenantDialog", () => {
  beforeEach(() => {
    fakeRouter.reset("/admin/tenants");
  });

  async function openDialog() {
    renderSignedIn(<CreateTenantDialog />, superAdmin, "/admin/tenants");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create tenant" }));
    return { user, dialog: await screen.findByRole("dialog") };
  }

  it("FE-50 derives the slug from the name until it is edited", async () => {
    const { user, dialog } = await openDialog();
    const slug = within(dialog).getByLabelText(/^Slug/);
    await user.type(within(dialog).getByLabelText(/^Name/), "Sinar Jaya");
    expect(slug).toHaveValue("sinar-jaya");
    await user.clear(slug);
    await user.type(slug, "sj");
    await user.type(within(dialog).getByLabelText(/^Name/), " Abadi");
    expect(slug).toHaveValue("sj");
  });

  it("FE-50 checks the slug pattern as it is typed", async () => {
    const { user, dialog } = await openDialog();
    const slug = within(dialog).getByLabelText(/^Slug/);
    await user.type(slug, "Bad_Slug");
    expect(
      await within(dialog).findByText(
        "Use 2 or more lowercase letters, digits or hyphens, starting with a letter or digit.",
      ),
    ).toBeInTheDocument();
    expect(slug).toHaveAttribute("aria-invalid", "true");
    await user.clear(slug);
    await user.type(slug, "good-slug");
    await waitFor(() => {
      expect(slug).toHaveAttribute("aria-invalid", "false");
    });
  });

  it("FE-50 shows DUPLICATE on the slug field", async () => {
    server.use(
      http.post("*/api/id/admin/tenants", () => errorBody(409, "DUPLICATE")),
    );
    const { user, dialog } = await openDialog();
    await user.type(within(dialog).getByLabelText(/^Name/), "Acme");
    await user.type(
      within(dialog).getByLabelText(/First admin/),
      "owner@acme.test",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Create tenant" }),
    );
    expect(
      await within(dialog).findByText("Another tenant already uses this slug."),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^Slug/)).toHaveFocus();
  });

  it("FE-50 creates the tenant and opens it with Invite sent", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/id/admin/tenants", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: acme }, { status: 201 });
      }),
    );
    const { user, dialog } = await openDialog();
    await user.type(within(dialog).getByLabelText(/^Name/), " Acme ");
    await user.type(
      within(dialog).getByLabelText(/First admin/),
      "owner@acme.test",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Create tenant" }),
    );
    await waitFor(() => {
      expect(fakeRouter.url).toBe(`/admin/tenants/${acme.id}`);
    });
    expect(sent).toEqual({
      name: "Acme",
      slug: "acme",
      first_admin_email: "owner@acme.test",
    });
    expect(
      await screen.findByText(
        "Tenant created. Invite sent to owner@acme.test.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("TenantDetail", () => {
  beforeEach(() => {
    fakeRouter.reset(`/admin/tenants/${acme.id}`);
    switchTenant.mockReset();
    switchTenant.mockResolvedValue(undefined);
  });

  function renderDetail(tenant: Tenant) {
    serveTenant(tenant);
    return renderSignedIn(
      <TenantDetail id={tenant.id} defaultSlug="default" />,
      superAdmin,
      `/admin/tenants/${tenant.id}`,
    );
  }

  it("FE-51 shows the tenant's facts", async () => {
    renderDetail(acme);
    expect(
      await screen.findByRole("heading", { level: 1, name: "Acme" }),
    ).toBeInTheDocument();
    const facts = screen.getByRole("region", { name: "Details" });
    expect(within(facts).getByText("acme")).toBeInTheDocument();
    expect(within(facts).getByText("12")).toBeInTheDocument();
  });

  it("FE-51 suspends after typing the name, with If-Match", async () => {
    let ifMatch: string | null = null;
    let sent: unknown;
    server.use(
      http.patch("*/api/id/admin/tenants/:id", async ({ request }) => {
        ifMatch = request.headers.get("if-match");
        sent = await request.json();
        return HttpResponse.json({
          data: { ...acme, status: "suspended", version: 4 },
        });
      }),
    );
    renderDetail(acme);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Suspend tenant" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "Suspend Acme?" });
    expect(
      within(dialog).getByText(
        "12 users can’t sign in until you reactivate it. Nothing is deleted.",
      ),
    ).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", {
      name: "Suspend tenant",
    });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/Type Acme/), "Acme");
    await user.click(confirm);
    expect(await screen.findByText("Acme is suspended.")).toBeInTheDocument();
    expect(ifMatch).toBe('"3"');
    expect(sent).toEqual({ status: "suspended" });
    expect(
      await screen.findByRole("button", { name: "Reactivate tenant" }),
    ).toBeInTheDocument();
  });

  it("FE-51 reactivates a suspended tenant after a confirmation", async () => {
    let sent: unknown;
    server.use(
      http.patch("*/api/id/admin/tenants/:id", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          data: { ...globex, status: "active", version: 8 },
        });
      }),
    );
    renderDetail(globex);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Reactivate tenant" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Reactivate Globex?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Reactivate tenant" }),
    );
    expect(
      await screen.findByText("Globex is active again."),
    ).toBeInTheDocument();
    expect(sent).toEqual({ status: "active" });
  });

  it("FE-51 VERSION_CONFLICT keeps the dialog open and Reload refetches", async () => {
    let gets = 0;
    server.use(
      http.get("*/api/id/admin/tenants/:id", () => {
        gets += 1;
        return HttpResponse.json({ data: acme });
      }),
      http.patch("*/api/id/admin/tenants/:id", () =>
        errorBody(409, "VERSION_CONFLICT"),
      ),
    );
    renderSignedIn(
      <TenantDetail id={acme.id} defaultSlug="default" />,
      superAdmin,
    );
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Suspend tenant" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Type Acme/), "Acme");
    await user.click(
      within(dialog).getByRole("button", { name: "Suspend tenant" }),
    );
    const banner = await within(dialog).findByRole("alert");
    expect(banner).toHaveTextContent(/Someone else changed this/);
    await user.click(within(banner).getByRole("button", { name: "Reload" }));
    await waitFor(() => {
      expect(gets).toBe(2);
    });
  });

  it("FE-51 the default tenant has no suspend action", async () => {
    renderDetail(home);
    expect(
      await screen.findByText(
        "This is the default tenant. It can’t be suspended.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend tenant" })).toBeNull();
    expect(
      screen.getByText("You’re working in this tenant now."),
    ).toBeInTheDocument();
  });

  it("FE-51 Open as admin switches into the tenant", async () => {
    renderDetail(acme);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Open as admin" }),
    );
    expect(switchTenant).toHaveBeenCalledWith(acme.id);
  });

  it("Open as admin shows the reason when identity refuses", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    switchTenant.mockRejectedValue(
      new ApiError({ status: 403, reason: "TENANT_SUSPENDED" }),
    );
    renderDetail(acme);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Open as admin" }),
    );
    expect(
      await screen.findByText(/This tenant is suspended\. Contact/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open as admin" })).toBeEnabled();
  });

  it("a suspended tenant cannot be opened, and says why", async () => {
    renderDetail(globex);
    expect(
      await screen.findByRole("button", { name: "Open as admin" }),
    ).toBeDisabled();
    expect(
      screen.getByText("Reactivate the tenant to open it."),
    ).toBeInTheDocument();
  });

  it("FE-51 renames with If-Match", async () => {
    let ifMatch: string | null = null;
    let sent: unknown;
    server.use(
      http.patch("*/api/id/admin/tenants/:id", async ({ request }) => {
        ifMatch = request.headers.get("if-match");
        sent = await request.json();
        return HttpResponse.json({
          data: { ...acme, name: "Acme Group", version: 4 },
        });
      }),
    );
    renderDetail(acme);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Rename" }));
    const dialog = await screen.findByRole("dialog", { name: "Rename Acme" });
    const name = within(dialog).getByLabelText(/^Name/);
    await user.clear(name);
    await user.type(name, "Acme Group");
    await user.click(within(dialog).getByRole("button", { name: "Save name" }));
    expect(await screen.findByText("Tenant renamed.")).toBeInTheDocument();
    expect(ifMatch).toBe('"3"');
    expect(sent).toEqual({ name: "Acme Group" });
    expect(
      await screen.findByRole("heading", { level: 1, name: "Acme Group" }),
    ).toBeInTheDocument();
  });

  it("an unknown tenant shows the not-found state", async () => {
    server.use(http.get("*/api/id/admin/tenants/:id", () => errorBody(404)));
    renderSignedIn(
      <TenantDetail id={acme.id} defaultSlug="default" />,
      superAdmin,
    );
    expect(await screen.findByText("Tenant not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to tenants" }),
    ).toHaveAttribute("href", "/admin/tenants");
  });
});
