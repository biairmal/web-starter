// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingSignIn,
  getPendingSignIn,
  setPendingSignIn,
} from "@/features/auth/pending-sign-in";
import { SignInForm } from "@/features/auth/sign-in-form";
import { TenantPicker } from "@/features/auth/tenant-picker";
import type { AuthConfig } from "@/lib/api/types";
import { renderWithIntl } from "../helpers/intl";
import { authConfigFixture } from "../msw/handlers";
import { server } from "../msw/server";
import { brand } from "@/config/brand";

const push = vi.fn();
const replace = vi.fn();
const hardNavigate = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));
vi.mock("@/lib/hard-navigate", () => ({
  hardNavigate: (url: string) => {
    hardNavigate(url);
  },
}));

const LOGIN = "*/api/auth/login";

function errorBody(reason: string, meta: Record<string, unknown> = {}) {
  return {
    timestamp: "2026-11-11T00:00:00Z",
    error: { code: "ERR", message: "failed", meta: { reason, ...meta } },
  };
}

function renderSignIn(config: AuthConfig = authConfigFixture, next = "/") {
  const client = new QueryClient();
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <SignInForm next={next} initialConfig={config} />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email = "dina@example.com", password = "secret") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  return user;
}

describe("SignInForm", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    hardNavigate.mockClear();
    clearPendingSignIn();
  });

  it("FE-1 shows only the methods the config enables", () => {
    renderSignIn({ ...authConfigFixture, registration: false });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: `Sign in to ${brand.appName}`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create an account" }),
    ).not.toBeInTheDocument();
  });

  it("FE-1 hides the password form when password sign-in is off", () => {
    renderSignIn({
      ...authConfigFixture,
      providers: { password: false, google: true },
    });
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toBeInTheDocument();
  });

  it("checks the fields before calling the BFF", async () => {
    let called = false;
    server.use(
      http.post(LOGIN, () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    renderSignIn();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign in" }));
    expect(
      await screen.findByText("Enter an email address, like name@example.com."),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(called).toBe(false);
  });

  it("FE-2 posts the credentials and next, then loads next", async () => {
    let sent: unknown;
    server.use(
      http.post(LOGIN, async ({ request }) => {
        sent = await request.json();
        expect(request.headers.get("x-requested-with")).toBe("web-starter");
        return HttpResponse.json({ data: { next: "/admin/users" } });
      }),
    );
    renderSignIn(authConfigFixture, "/admin/users");
    await fillAndSubmit();
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/admin/users");
    });
    expect(sent).toEqual({
      email: "dina@example.com",
      password: "secret",
      next: "/admin/users",
    });
  });

  it("FE-2 shows the generic error for wrong credentials", async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(errorBody("INVALID_CREDENTIALS"), { status: 401 }),
      ),
    );
    renderSignIn();
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it("FE-10 shows the lockout minutes and holds the submit button", async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(errorBody("ACCOUNT_LOCKED", { retry_after: 840 }), {
          status: 401,
          headers: { "Retry-After": "840" },
        }),
      ),
    );
    renderSignIn();
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many attempts. Try again in 14 minutes.",
    );
    expect(
      screen.getByRole("button", { name: /Try again in 840 seconds/ }),
    ).toBeDisabled();
  });

  it("shows an unverified email as a notice, not an error", async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(errorBody("EMAIL_NOT_VERIFIED"), { status: 403 }),
      ),
    );
    renderSignIn();
    await fillAndSubmit();
    expect(
      await screen.findByText("Verify your email to sign in."),
    ).toBeInTheDocument();
  });

  it("shows a disabled account as a full-page notice with the support email", async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(errorBody("ACCOUNT_DISABLED"), { status: 403 }),
      ),
    );
    renderSignIn();
    const user = await fillAndSubmit();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You can’t sign in right now",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(brand.supportEmail);
    await user.click(screen.getByRole("button", { name: "Back to sign in" }));
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("puts server field errors on the fields", async () => {
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json(
          {
            timestamp: "2026-11-11T00:00:00Z",
            error: {
              code: "ERR_BAD_REQUEST",
              message: "validation failed",
              meta: {
                fields: { email: "email must be a valid email address" },
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    renderSignIn();
    await fillAndSubmit();
    expect(
      await screen.findByText("email must be a valid email address"),
    ).toBeInTheDocument();
  });

  it("FE-8 keeps the choice in memory and opens the tenant picker", async () => {
    const tenants = [
      {
        id: "00000000-0000-4000-8000-0000000000a1",
        slug: "acme",
        name: "Acme",
      },
    ];
    server.use(
      http.post(LOGIN, () =>
        HttpResponse.json({ data: { tenant_required: true, tenants } }),
      ),
    );
    renderSignIn(authConfigFixture, "/x");
    await fillAndSubmit();
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/sign-in/tenant");
    });
    expect(getPendingSignIn()).toEqual({
      email: "dina@example.com",
      password: "secret",
      tenants,
      next: "/x",
    });
    // Only the email and next survive a reload; never the password.
    expect(window.sessionStorage.getItem("web-starter.sign-in")).toBe(
      JSON.stringify({ email: "dina@example.com", next: "/x" }),
    );
  });
});

describe("TenantPicker", () => {
  beforeEach(() => {
    replace.mockClear();
    hardNavigate.mockClear();
    clearPendingSignIn();
  });

  it("FE-8 signs in to the picked tenant", async () => {
    setPendingSignIn({
      email: "dina@example.com",
      password: "secret",
      next: "/x",
      tenants: [
        {
          id: "00000000-0000-4000-8000-0000000000a1",
          slug: "acme",
          name: "Acme",
        },
        {
          id: "00000000-0000-4000-8000-0000000000a2",
          slug: "globex",
          name: "Globex",
        },
      ],
    });
    let sent: unknown;
    server.use(
      http.post(LOGIN, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { next: "/x" } });
      }),
    );
    renderWithIntl(<TenantPicker />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Choose a workspace" }),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Globex/ }));
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/x");
    });
    expect(sent).toEqual({
      email: "dina@example.com",
      password: "secret",
      tenant: "globex",
      next: "/x",
    });
    expect(getPendingSignIn()).toBeNull();
  });

  it("goes back to sign-in, keeping next, when the choice was lost", async () => {
    window.sessionStorage.setItem(
      "web-starter.sign-in",
      JSON.stringify({ email: "dina@example.com", next: "/admin/users" }),
    );
    renderWithIntl(<TenantPicker />);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/sign-in?next=%2Fadmin%2Fusers");
    });
  });
});
