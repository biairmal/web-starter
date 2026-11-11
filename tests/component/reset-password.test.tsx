// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { ReasonBanner } from "@/features/auth/reason-banner";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { renderWithIntl } from "../helpers/intl";
import { server } from "../msw/server";

const hardNavigate = vi.fn();
vi.mock("@/lib/hard-navigate", () => ({
  hardNavigate: (url: string) => {
    hardNavigate(url);
  },
}));

function errorBody(reason: string, fields?: Record<string, string>) {
  return {
    error: {
      code: "ERR_BAD_REQUEST",
      message: "bad",
      meta: { reason, ...(fields ? { fields } : {}) },
    },
  };
}

describe("ForgotPasswordForm", () => {
  it("FE-6 shows the same confirmation after any address", async () => {
    server.use(
      http.post("*/api/auth/password/forgot", () =>
        HttpResponse.json({}, { status: 202 }),
      ),
    );
    renderWithIntl(<ForgotPasswordForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Email"), "nobody@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(
      await screen.findByText(/If that address has an account/),
    ).toBeInTheDocument();
  });
});

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    hardNavigate.mockClear();
  });

  async function submit(password: string) {
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("New password"), password);
    await user.click(screen.getByRole("button", { name: "Change password" }));
  }

  it("FE-6 resets and goes to sign-in with the confirmation", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/auth/password/reset", async ({ request }) => {
        sent = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    window.history.replaceState(null, "", "/reset-password#token=t1");
    renderWithIntl(<ResetPasswordForm />);
    expect(
      await screen.findByText("This signs you out on all your devices."),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe("");
    await submit("copper-meadow-signal");
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith(
        "/sign-in?reason=PASSWORD_RESET",
      );
    });
    expect(sent).toEqual({ token: "t1", password: "copper-meadow-signal" });
  });

  it("FE-6 shows PASSWORD_POLICY on the field", async () => {
    server.use(
      http.post("*/api/auth/password/reset", () =>
        HttpResponse.json(
          errorBody("PASSWORD_POLICY", { password: "too common" }),
          { status: 400 },
        ),
      ),
    );
    window.history.replaceState(null, "", "/reset-password#token=t1");
    renderWithIntl(<ResetPasswordForm />);
    await submit("password1234");
    expect(
      await screen.findByText("This password is too common. Choose another."),
    ).toBeInTheDocument();
    expect(hardNavigate).not.toHaveBeenCalled();
  });

  it("FE-6 shows the expired state for a used link", async () => {
    server.use(
      http.post("*/api/auth/password/reset", () =>
        HttpResponse.json(errorBody("TOKEN_INVALID"), { status: 400 }),
      ),
    );
    window.history.replaceState(null, "", "/reset-password#token=old");
    renderWithIntl(<ResetPasswordForm />);
    await submit("copper-meadow-signal");
    expect(
      await screen.findByRole("link", { name: "Send a new link" }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("shows the expired state when the link has no token", async () => {
    window.history.replaceState(null, "", "/reset-password");
    renderWithIntl(<ResetPasswordForm />);
    expect(
      await screen.findByRole("heading", {
        name: "This link has expired or was already used",
      }),
    ).toBeInTheDocument();
  });
});

describe("ReasonBanner", () => {
  it("shows the password-reset confirmation", () => {
    renderWithIntl(<ReasonBanner reason="PASSWORD_RESET" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Password changed. Sign in with your new password.",
    );
  });

  it("ignores unknown values", () => {
    const { container } = renderWithIntl(<ReasonBanner reason="<b>hi</b>" />);
    expect(container).toBeEmptyDOMElement();
  });
});
