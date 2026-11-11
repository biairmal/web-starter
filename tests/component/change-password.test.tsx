// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { SESSION_CHANNEL_NAME } from "@/lib/session-channel";
import { renderWithIntl } from "../helpers/intl";
import { server } from "../msw/server";

const hardNavigate = vi.fn();
vi.mock("@/lib/hard-navigate", () => ({
  hardNavigate: (url: string) => {
    hardNavigate(url);
  },
}));

async function submit(password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("New password"), password);
  await user.click(screen.getByRole("button", { name: "Change password" }));
}

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    hardNavigate.mockClear();
  });

  it("FE-7 asks only for the new password and loads next after the change", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/auth/password/change", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { next: "/admin/users" } });
      }),
    );
    renderWithIntl(<ChangePasswordForm />);
    expect(
      screen.queryByLabelText(/current password/i),
    ).not.toBeInTheDocument();
    await submit("granite-harbor-root");
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/admin/users");
    });
    expect(sent).toEqual({ new_password: "granite-harbor-root" });
  });

  it("FE-7 shows the policy error on the field", async () => {
    server.use(
      http.post("*/api/auth/password/change", () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_BAD_REQUEST",
              message: "validation failed",
              meta: {
                reason: "PASSWORD_POLICY",
                fields: { new_password: "too common" },
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    renderWithIntl(<ChangePasswordForm />);
    await submit("password1234");
    expect(
      await screen.findByText("This password is too common. Choose another."),
    ).toBeInTheDocument();
  });

  it("FE-7 goes to sign-in when the restricted session ran out", async () => {
    server.use(
      http.post("*/api/auth/password/change", () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_UNAUTHORIZED",
              message: "ended",
              meta: { reason: "SESSION_ENDED", cause: "NO_SESSION" },
            },
          },
          { status: 401 },
        ),
      ),
    );
    renderWithIntl(<ChangePasswordForm />);
    await submit("granite-harbor-root");
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith(
        "/sign-in?reason=SESSION_ENDED&next=%2F",
      );
    });
  });
});

describe("SignOutButton", () => {
  it("FE-22 signs out, tells other tabs, and goes to sign-in", async () => {
    hardNavigate.mockClear();
    let called = false;
    server.use(
      http.post("*/api/auth/logout", ({ request }) => {
        called = request.headers.get("x-requested-with") === "web-starter";
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const messages: unknown[] = [];
    const channel = new BroadcastChannel(SESSION_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      messages.push(event.data);
    };
    try {
      renderWithIntl(<SignOutButton>Sign out</SignOutButton>);
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Sign out" }));
      await waitFor(() => {
        expect(hardNavigate).toHaveBeenCalledWith("/sign-in");
      });
      expect(called).toBe(true);
      await waitFor(() => {
        expect(messages).toEqual([{ type: "signed-out" }]);
      });
    } finally {
      channel.close();
    }
  });

  it("FE-22 still goes to sign-in when the BFF cannot be reached", async () => {
    hardNavigate.mockClear();
    server.use(http.post("*/api/auth/logout", () => HttpResponse.error()));
    renderWithIntl(<SignOutButton>Sign out</SignOutButton>);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith("/sign-in");
    });
  });
});
