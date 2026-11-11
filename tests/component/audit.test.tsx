// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuditTable } from "@/features/audit/audit-table";
import type { AuditEntry, Me } from "@/lib/api/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const DINA = "00000000-0000-4000-8000-00000000b001";

const entries: AuditEntry[] = [
  {
    id: 2,
    at: "2026-11-10T09:30:00Z",
    actor: { id: DINA, display_name: "Dina Pratama" },
    action: "role.permissions",
    target_type: "role",
    target_id: "00000000-0000-4000-8000-00000000a002",
    before: { name: "Manager", permissions: ["users:read"] },
    after: { name: "Manager", permissions: ["audit:read", "users:read"] },
    ip: "198.51.100.4",
    request_id: "req-1",
  },
  { id: 1, at: "2026-11-08T07:00:00Z", action: "auth.login_failed" },
  { id: 0, at: "2026-11-07T07:00:00Z", action: "billing.charge" },
];

const auditor: Me = { ...meFixture, permissions: ["audit:read", "users:read"] };

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

function serve(items: AuditEntry[] = entries) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get("*/api/id/admin/audit", ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(page(items));
    }),
    http.get("*/api/id/admin/users", () =>
      HttpResponse.json(
        page([
          {
            id: DINA,
            email: "dina@example.test",
            display_name: "Dina Pratama",
            status: "active",
            membership_status: "active",
            roles: [],
            created_at: "2026-09-01T00:00:00Z",
          },
        ]),
      ),
    ),
    http.get("*/api/id/admin/users/:id", () =>
      HttpResponse.json(
        envelope({
          id: DINA,
          email: "dina@example.test",
          display_name: "Dina Pratama",
          status: "active",
          membership_status: "active",
          roles: [],
          created_at: "2026-09-01T00:00:00Z",
          providers: { password: true, google: false },
          version: 1,
        }),
      ),
    ),
  );
  return queries;
}

function render(me: Me = auditor) {
  return renderSignedIn(<AuditTable />, me, "/admin/audit");
}

beforeEach(() => {
  fakeRouter.reset("/admin/audit");
});

describe("AuditTable", () => {
  it("FE-46 says what happened in words, who did it and on what", async () => {
    serve();
    render();
    const table = await screen.findByRole("table", { name: "Audit log" });
    expect(
      within(table).getByText("Changed a role’s permissions"),
    ).toBeInTheDocument();
    expect(within(table).getByText("Dina Pratama")).toBeInTheDocument();
    expect(within(table).getByText("role 00000000")).toBeInTheDocument();
    expect(within(table).getByText("Failed to sign in")).toBeInTheDocument();
    expect(within(table).getAllByText("Anonymous")).toHaveLength(2);
    // An action without a phrase shows its name.
    expect(within(table).getAllByText("billing.charge").length).toBeGreaterThan(
      0,
    );
  });

  it("FE-46 shows times in the viewer's time zone with UTC on hover", async () => {
    serve();
    render();
    const table = await screen.findByRole("table", { name: "Audit log" });
    const time = within(table)
      .getAllByRole("time")
      .find((element) => element.getAttribute("datetime") === entries[0]?.at);
    expect(time).toHaveAttribute("title", "2026-11-10 09:30:00 UTC");
    // In the zone of the machine running the test, not the provider's UTC.
    const local = new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date("2026-11-10T09:30:00Z"));
    expect(time).toHaveTextContent(local);
  });

  it("FE-46 expands a row into the before/after view", async () => {
    serve();
    render();
    const user = userEvent.setup();
    const table = await screen.findByRole("table", { name: "Audit log" });
    const expand = within(table).getByRole("button", {
      name: "Show the changes of Changed a role’s permissions",
    });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    await user.click(expand);
    expect(expand).toHaveAttribute("aria-expanded", "true");
    const diff = screen.getByRole("table", { name: "Changes" });
    const permissions = within(diff).getByRole("rowheader", {
      name: /permissions/,
    });
    expect(permissions).toHaveTextContent("(changed)");
    const row = permissions.closest("tr") as HTMLElement;
    expect(within(row).getByText('["users:read"]')).toBeInTheDocument();
    expect(
      within(row).getByText('["audit:read","users:read"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("IP 198.51.100.4 · Request req-1"),
    ).toBeInTheDocument();
    await user.click(
      within(table).getByRole("button", {
        name: "Hide the changes of Changed a role’s permissions",
      }),
    );
    expect(screen.queryByRole("table", { name: "Changes" })).toBeNull();
  });

  it("FE-46 sends the filters from the URL", async () => {
    const queries = serve();
    fakeRouter.reset(
      `/admin/audit?actor=${DINA}&action=role.&from=2026-11-01&to=2026-11-10`,
    );
    render();
    await screen.findByRole("table", { name: "Audit log" });
    const query = queries.at(-1);
    expect(query?.get("actor")).toBe(DINA);
    expect(query?.get("action")).toBe("role.%");
    // Days are in the viewer's time zone, sent as instants.
    expect(query?.get("from")).toBe(new Date(2026, 10, 1).toISOString());
    expect(query?.get("to")).toBe(
      new Date(2026, 10, 10, 23, 59, 59, 999).toISOString(),
    );
    // The actor restored from the URL shows by name.
    expect(
      await screen.findByText("Dina Pratama", { selector: "span" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("To")).toHaveValue("2026-11-10");
  });

  it("FE-46 picks the actor from a user search", async () => {
    serve();
    render();
    const user = userEvent.setup();
    await user.type(
      await screen.findByRole("searchbox", { name: "By" }),
      "dina",
    );
    const results = await screen.findByRole("list", {
      name: "Matching people",
    });
    await user.click(
      within(results).getByRole("button", { name: /Dina Pratama/ }),
    );
    expect(fakeRouter.search.get("actor")).toBe(DINA);
    await user.click(
      await screen.findByRole("button", { name: "Clear the person filter" }),
    );
    expect(fakeRouter.search.has("actor")).toBe(false);
  });

  it("FE-46 a date sets the range in the URL", async () => {
    serve();
    render();
    const user = userEvent.setup();
    const from = await screen.findByLabelText("From");
    await user.type(from, "2026-11-01");
    await waitFor(() => {
      expect(fakeRouter.search.get("from")).toBe("2026-11-01");
    });
  });

  it("hides the person search without users:read", async () => {
    serve();
    render({ ...meFixture, permissions: ["audit:read"] });
    await screen.findByRole("table", { name: "Audit log" });
    expect(screen.queryByRole("searchbox", { name: "By" })).toBeNull();
  });

  it("FE-46 Refresh refetches; nothing polls", async () => {
    const queries = serve();
    render();
    await screen.findByRole("table", { name: "Audit log" });
    expect(queries).toHaveLength(1);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(queries).toHaveLength(2);
    });
    expect(screen.getByText(/^Updated /)).toBeInTheDocument();
  });

  it("shows the empty and no-match states", async () => {
    serve([]);
    const view = render();
    expect(
      await screen.findByText("Nothing has happened here yet"),
    ).toBeInTheDocument();
    view.unmount();
    fakeRouter.reset("/admin/audit?action=tenant.");
    render();
    expect(
      await screen.findByText("No entries match these filters"),
    ).toBeInTheDocument();
  });
});
