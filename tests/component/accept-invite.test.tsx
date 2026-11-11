// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AcceptInvite } from "@/features/auth/accept-invite-form";
import type { InvitePreview } from "@/lib/api/types";
import { renderWithIntl } from "../helpers/intl";
import { server } from "../msw/server";

const hardNavigate = vi.fn();
vi.mock("@/lib/hard-navigate", () => ({
  hardNavigate: (url: string) => {
    hardNavigate(url);
  },
}));

function preview(overrides: Partial<InvitePreview> = {}): InvitePreview {
  return {
    tenant: { name: "Acme" },
    email_masked: "b**@example.com",
    has_password: false,
    ...overrides,
  };
}

function serveInfo(invite: InvitePreview, seen: unknown[] = []) {
  server.use(
    http.post("*/api/auth/invite/info", async ({ request }) => {
      seen.push(await request.json());
      return HttpResponse.json({ data: invite });
    }),
  );
}

function errorBody(reason: string) {
  return { error: { code: "ERR", message: "x", meta: { reason } } };
}

describe("AcceptInvite", () => {
  beforeEach(() => {
    hardNavigate.mockClear();
    window.history.replaceState(null, "", "/invite#token=inv-1");
  });

  it("FE-9 reads the token once, removes it, and asks for a password when the account has none", async () => {
    const seen: unknown[] = [];
    serveInfo(preview(), seen);
    let accepted: unknown;
    server.use(
      http.post("*/api/auth/invite/accept", async ({ request }) => {
        accepted = await request.json();
        return HttpResponse.json({ data: { next: "/" } });
      }),
    );
    renderWithIntl(<AcceptInvite signedInAs={null} />);
    expect(
      await screen.findByRole("heading", { name: "Join Acme" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You’ve been invited as b**@example.com."),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    expect(seen).toEqual([{ token: "inv-1" }]);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/Your name/), "Bima");
    await user.type(
      screen.getByLabelText("Choose a password"),
      "saffron-lagoon-bima",
    );
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/");
    });
    expect(accepted).toEqual({
      token: "inv-1",
      password: "saffron-lagoon-bima",
      display_name: "Bima",
    });
  });

  it("FE-9 shows no password fields for an account that has one", async () => {
    serveInfo(preview({ has_password: true }));
    let accepted: unknown;
    server.use(
      http.post("*/api/auth/invite/accept", async ({ request }) => {
        accepted = await request.json();
        return HttpResponse.json({ data: { next: "/" } });
      }),
    );
    renderWithIntl(<AcceptInvite signedInAs={null} />);
    await screen.findByRole("heading", { name: "Join Acme" });
    expect(
      screen.queryByLabelText("Choose a password"),
    ).not.toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Accept invitation" }));
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/");
    });
    expect(accepted).toEqual({ token: "inv-1" });
  });

  it("FE-9 shows the expired state for a used invite", async () => {
    server.use(
      http.post("*/api/auth/invite/info", () =>
        HttpResponse.json(errorBody("TOKEN_INVALID"), { status: 400 }),
      ),
    );
    renderWithIntl(<AcceptInvite signedInAs={null} />);
    expect(
      await screen.findByRole("heading", {
        name: "This invitation has expired or was already used",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/support@acme.com/)).toBeInTheDocument();
  });

  it("FE-9 asks someone signed in as another user to sign out first, keeping the token", async () => {
    serveInfo(preview());
    let signedOut = false;
    server.use(
      http.post("*/api/auth/logout", () => {
        signedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithIntl(<AcceptInvite signedInAs="Dina Pratama" />);
    expect(
      await screen.findByText(
        "You are signed in as Dina Pratama. Sign out to accept this invite for b**@example.com.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Choose a password"),
    ).not.toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out and continue" }));
    expect(
      await screen.findByLabelText("Choose a password"),
    ).toBeInTheDocument();
    expect(signedOut).toBe(true);
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it("uses a generic sentence when the signed-in user has no name", async () => {
    serveInfo(preview());
    renderWithIntl(<AcceptInvite signedInAs="" />);
    expect(
      await screen.findByText(/You are signed in to another account\./),
    ).toBeInTheDocument();
  });

  it("FE-9 shows PASSWORD_POLICY on the field and clears it when the password changes", async () => {
    serveInfo(preview());
    server.use(
      http.post("*/api/auth/invite/accept", () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_BAD_REQUEST",
              message: "validation failed",
              meta: {
                reason: "PASSWORD_POLICY",
                fields: { password: "too common" },
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    renderWithIntl(<AcceptInvite signedInAs={null} />);
    const user = userEvent.setup();
    const input = await screen.findByLabelText("Choose a password");
    await user.type(input, "password1234");
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(
      await screen.findByText("This password is too common. Choose another."),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.type(input, "-plus-more");
    await waitFor(() => {
      expect(input).toHaveAttribute("aria-invalid", "false");
    });
    expect(
      screen.queryByText("This password is too common. Choose another."),
    ).not.toBeInTheDocument();
  });

  it("FE-9 shows the expired state when the invite is used before accepting", async () => {
    serveInfo(preview());
    server.use(
      http.post("*/api/auth/invite/accept", () =>
        HttpResponse.json(errorBody("TOKEN_INVALID"), { status: 400 }),
      ),
    );
    renderWithIntl(<AcceptInvite signedInAs={null} />);
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Choose a password"),
      "saffron-lagoon-bima",
    );
    await user.click(screen.getByRole("button", { name: "Accept invitation" }));
    expect(
      await screen.findByRole("heading", {
        name: "This invitation has expired or was already used",
      }),
    ).toBeInTheDocument();
  });
});
