// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "@/components/layout/user-menu";
import { PasswordForm } from "@/features/account/password-form";
import { ProfileForm } from "@/features/account/profile-form";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";
import { renderSignedIn } from "../helpers/signed-in";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
  useRouter: () => ({ refresh: vi.fn() }),
}));

function errorBody(reason: string, fields?: Record<string, string>) {
  return {
    timestamp: "2026-11-11T00:00:00Z",
    error: {
      code: "ERR",
      message: "failed",
      meta: { reason, ...(fields ? { fields } : {}) },
    },
  };
}

describe("ProfileForm", () => {
  it("FE-32 saves the display name and the user menu follows without a reload", async () => {
    let sent: unknown;
    server.use(
      http.patch("*/api/id/me", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({
          timestamp: "2026-11-11T00:00:00Z",
          data: { ...meFixture, display_name: "Dina Pratama" },
        });
      }),
    );
    renderSignedIn(
      <>
        <UserMenu />
        <ProfileForm />
      </>,
    );
    const user = userEvent.setup();
    const name = screen.getByLabelText("Display name");
    expect(name).toHaveValue("Test User");
    await user.clear(name);
    await user.type(name, "  Dina Pratama ");
    await user.click(screen.getByRole("button", { name: "Save profile" }));

    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
    expect(sent).toEqual({ display_name: "Dina Pratama" });
    expect(
      screen.getByRole("button", { name: /Open account menu/ }),
    ).toHaveTextContent("Dina Pratama");
  });

  it("FE-32 shows the email read-only with whether it is verified", () => {
    renderSignedIn(<ProfileForm />, { ...meFixture, email_verified: false });
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText("Not verified")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Email" })).toBeNull();
  });

  it("FE-32 requires a name", async () => {
    renderSignedIn(<ProfileForm />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Display name"));
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("Enter a name.")).toBeInTheDocument();
  });
});

describe("PasswordForm", () => {
  async function fill(current: string | undefined, next: string) {
    const user = userEvent.setup();
    if (current !== undefined) {
      await user.type(screen.getByLabelText("Current password"), current);
    }
    await user.type(screen.getByLabelText("New password"), next);
    return user;
  }

  it("FE-32 changes the password with the current one and says other devices were signed out", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/auth/password/change", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { next: "/account" } });
      }),
      http.get("*/api/id/me", () =>
        HttpResponse.json({
          timestamp: "2026-11-11T00:00:00Z",
          data: meFixture,
        }),
      ),
    );
    const { navigate } = renderSignedIn(<PasswordForm />);
    const user = await fill("old-password-1", "granite-harbor-root");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText("Password changed")).toBeInTheDocument();
    expect(
      screen.getByText("Other devices were signed out."),
    ).toBeInTheDocument();
    expect(sent).toEqual({
      current_password: "old-password-1",
      new_password: "granite-harbor-root",
      next: "/account",
    });
    // Still signed in on this device: no navigation, and the fields are cleared.
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it("FE-32 a wrong current password is a field error and keeps the session", async () => {
    server.use(
      http.post("*/api/auth/password/change", () =>
        HttpResponse.json(errorBody("INVALID_CREDENTIALS"), { status: 401 }),
      ),
    );
    const { navigate } = renderSignedIn(<PasswordForm />);
    const user = await fill("not-my-password", "granite-harbor-root");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByText("That isn’t your current password."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveFocus();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("FE-32 shows the policy error on the new password", async () => {
    server.use(
      http.post("*/api/auth/password/change", () =>
        HttpResponse.json(
          errorBody("PASSWORD_POLICY", { new_password: "too common" }),
          { status: 400 },
        ),
      ),
    );
    renderSignedIn(<PasswordForm />);
    const user = await fill("old-password-1", "password1234");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(
      await screen.findByText("This password is too common. Choose another."),
    ).toBeInTheDocument();
  });

  it("FE-32 asks for no current password when the account has none", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/auth/password/change", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { next: "/account" } });
      }),
      http.get("*/api/id/me", () =>
        HttpResponse.json({
          timestamp: "2026-11-11T00:00:00Z",
          data: meFixture,
        }),
      ),
    );
    renderSignedIn(<PasswordForm />, {
      ...meFixture,
      providers: { password: false, google: true },
    });
    expect(screen.queryByLabelText("Current password")).toBeNull();
    const user = await fill(undefined, "granite-harbor-root");
    await user.click(screen.getByRole("button", { name: "Set password" }));

    expect(await screen.findByText("Password set")).toBeInTheDocument();
    expect(sent).toEqual({
      new_password: "granite-harbor-root",
      next: "/account",
    });
    // The refetched me has a password now, so the form asks for it.
    await waitFor(() => {
      expect(screen.getByLabelText("Current password")).toBeInTheDocument();
    });
  });

  it("FE-32 sends a session end to sign-in", async () => {
    server.use(
      http.post("*/api/auth/password/change", () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_UNAUTHORIZED",
              message: "ended",
              meta: { reason: "SESSION_ENDED", cause: "REFRESH_REUSED" },
            },
          },
          { status: 401 },
        ),
      ),
    );
    const { navigate } = renderSignedIn(<PasswordForm />);
    const user = await fill("old-password-1", "granite-harbor-root");
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith(
        "/sign-in?reason=REFRESH_REUSED&next=%2Faccount",
      );
    });
  });
});
