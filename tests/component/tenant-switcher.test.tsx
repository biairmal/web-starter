// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import type { Me } from "@/lib/api/types";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

const hardNavigate = vi.fn();
vi.mock("@/lib/hard-navigate", () => ({
  hardNavigate: (url: string) => {
    hardNavigate(url);
  },
}));

const posted = vi.fn();
vi.mock(import("@/lib/session-channel"), async (importOriginal) => ({
  ...(await importOriginal()),
  postSessionMessage: (message: unknown) => {
    posted(message);
  },
}));

const DEFAULT = meFixture.tenant;
const ACME = {
  id: "00000000-0000-4000-8000-0000000000a1",
  slug: "acme",
  name: "Acme",
  status: "active" as const,
};

function serveTenants(tenants: (typeof ACME)[], counter?: { calls: number }) {
  server.use(
    http.get("*/api/id/me/tenants", () => {
      if (counter) {
        counter.calls += 1;
      }
      return HttpResponse.json({ data: tenants });
    }),
  );
}

function errorBody(reason: string) {
  return { error: { code: "ERR_FORBIDDEN", message: "x", meta: { reason } } };
}

const me: Me = meFixture;

describe("TenantSwitcher", () => {
  beforeEach(() => {
    hardNavigate.mockClear();
    posted.mockClear();
  });

  it("FE-31 is hidden in single mode and never asks for the tenants", async () => {
    const counter = { calls: 0 };
    serveTenants([{ ...DEFAULT, status: "active" }, ACME], counter);
    renderSignedIn(<TenantSwitcher tenancy="single" />, me);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("button", { name: /Switch tenant/ })).toBeNull();
    expect(counter.calls).toBe(0);
  });

  it("FE-31 is hidden for a user in one tenant", async () => {
    const counter = { calls: 0 };
    serveTenants([{ ...DEFAULT, status: "active" }], counter);
    renderSignedIn(<TenantSwitcher tenancy="multi" />, me);
    await waitFor(() => {
      expect(counter.calls).toBe(1);
    });
    expect(screen.queryByRole("button", { name: /Switch tenant/ })).toBeNull();
  });

  it("FE-31 switches, tells the other tabs and reloads to /", async () => {
    serveTenants([{ ...DEFAULT, status: "active" }, ACME]);
    let sent: unknown;
    server.use(
      http.post("*/api/auth/switch-tenant", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { next: "/" } });
      }),
    );
    renderSignedIn(<TenantSwitcher tenancy="multi" />, me);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: /Default.*Switch tenant/ }),
    );
    expect(
      screen.getByRole("menuitemradio", { name: /Default/ }),
    ).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: /Acme/ }));
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/");
    });
    expect(sent).toEqual({ tenant_id: ACME.id });
    expect(posted).toHaveBeenCalledWith({ type: "tenant-switched" });
  });

  it("picking the current tenant does nothing", async () => {
    serveTenants([{ ...DEFAULT, status: "active" }, ACME]);
    let calls = 0;
    server.use(
      http.post("*/api/auth/switch-tenant", () => {
        calls += 1;
        return HttpResponse.json({ data: { next: "/" } });
      }),
    );
    renderSignedIn(<TenantSwitcher tenancy="multi" />, me);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Default/ }));
    await user.click(screen.getByRole("menuitemradio", { name: /Default/ }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toBe(0);
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it("FE-31 TENANT_SUSPENDED shows a toast, stays put and refreshes the list", async () => {
    const counter = { calls: 0 };
    serveTenants([{ ...DEFAULT, status: "active" }, ACME], counter);
    server.use(
      http.post("*/api/auth/switch-tenant", () =>
        HttpResponse.json(errorBody("TENANT_SUSPENDED"), { status: 403 }),
      ),
    );
    renderSignedIn(<TenantSwitcher tenancy="multi" />, me);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Default/ }));
    await user.click(screen.getByRole("menuitemradio", { name: /Acme/ }));
    expect(
      await screen.findByText(/This tenant is suspended\. Contact/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(counter.calls).toBe(2);
    });
    expect(hardNavigate).not.toHaveBeenCalled();
    expect(posted).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Default/ })).toBeEnabled();
  });

  it("NOT_A_MEMBER shows a toast", async () => {
    serveTenants([{ ...DEFAULT, status: "active" }, ACME]);
    server.use(
      http.post("*/api/auth/switch-tenant", () =>
        HttpResponse.json(errorBody("NOT_A_MEMBER"), { status: 403 }),
      ),
    );
    renderSignedIn(<TenantSwitcher tenancy="multi" />, me);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Default/ }));
    await user.click(screen.getByRole("menuitemradio", { name: /Acme/ }));
    expect(
      await screen.findByText("You are no longer a member of that tenant."),
    ).toBeInTheDocument();
    expect(hardNavigate).not.toHaveBeenCalled();
  });
});
