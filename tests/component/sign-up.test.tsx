// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recallSignUpEmail } from "@/features/auth/check-email-store";
import { ResendButton } from "@/features/auth/resend-button";
import { SignUpForm } from "@/features/auth/sign-up-form";
import {
  tokenFromHash,
  useFragmentToken,
} from "@/features/auth/use-fragment-token";
import { VerifyEmail } from "@/features/auth/verify-email";
import type { AuthConfig } from "@/lib/api/types";
import { renderWithIntl } from "../helpers/intl";
import { authConfigFixture } from "../msw/handlers";
import { server } from "../msw/server";

const push = vi.fn();
const hardNavigate = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock("@/lib/hard-navigate", () => ({
  hardNavigate: (url: string) => {
    hardNavigate(url);
  },
}));

function renderSignUp(config: AuthConfig = authConfigFixture) {
  return renderWithIntl(
    <QueryClientProvider client={new QueryClient()}>
      <SignUpForm initialConfig={config} />
    </QueryClientProvider>,
  );
}

async function fill(password = "violet-orchard-ferry") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Rina Wijaya");
  await user.type(screen.getByLabelText("Email"), "rina@example.com");
  await user.type(screen.getByLabelText("Password"), password);
  return user;
}

describe("tokenFromHash and useFragmentToken", () => {
  it("reads the token from a fragment", () => {
    expect(tokenFromHash("#token=abc")).toBe("abc");
    expect(tokenFromHash("#token=")).toBeNull();
    expect(tokenFromHash("")).toBeNull();
  });

  it("FE-5 returns the token once and removes it from the URL", async () => {
    window.history.replaceState(null, "", "/verify-email?x=1#token=secret");
    const { result } = renderHook(() => useFragmentToken());
    await waitFor(() => {
      expect(result.current).toEqual({ state: "found", token: "secret" });
    });
    expect(window.location.hash).toBe("");
    expect(window.location.pathname + window.location.search).toBe(
      "/verify-email?x=1",
    );
  });
});

describe("SignUpForm", () => {
  beforeEach(() => {
    push.mockClear();
    hardNavigate.mockClear();
  });

  it("FE-4 shows the password rules live", async () => {
    renderSignUp();
    const user = userEvent.setup();
    const rule = screen.getByText("At least 10 characters").closest("li");
    expect(rule).toHaveAttribute("data-met", "false");
    await user.type(screen.getByLabelText("Password"), "0123456789");
    expect(rule).toHaveAttribute("data-met", "true");
  });

  it("FE-4 registers and goes to check email, remembering the address", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/auth/register", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(
          { data: { status: "accepted" } },
          { status: 202 },
        );
      }),
    );
    renderSignUp();
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/sign-up/check-email");
    });
    expect(sent).toEqual({
      display_name: "Rina Wijaya",
      email: "rina@example.com",
      password: "violet-orchard-ferry",
    });
    expect(recallSignUpEmail()).toBe("rina@example.com");
  });

  it("asks for the workspace in multi mode", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/auth/register", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({}, { status: 202 });
      }),
    );
    renderSignUp({ ...authConfigFixture, tenancy: "multi" });
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("Enter your workspace."),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Workspace"), "acme");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => {
      expect(sent).toMatchObject({ tenant: "acme" });
    });
  });

  it("FE-4 shows PASSWORD_POLICY on the password field", async () => {
    server.use(
      http.post("*/api/auth/register", () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_BAD_REQUEST",
              message: "validation failed",
              meta: {
                reason: "PASSWORD_POLICY",
                fields: { password: "password is too common" },
              },
            },
          },
          { status: 400 },
        ),
      ),
    );
    renderSignUp();
    const user = await fill("password123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("This password is too common. Choose another."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("sends a closed registration to the sign-in banner", async () => {
    server.use(
      http.post("*/api/auth/register", () =>
        HttpResponse.json(
          {
            error: {
              code: "ERR_FORBIDDEN",
              message: "closed",
              meta: { reason: "REGISTRATION_CLOSED" },
            },
          },
          { status: 403 },
        ),
      ),
    );
    renderSignUp();
    const user = await fill();
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => {
      expect(hardNavigate).toHaveBeenCalledWith(
        "/sign-in?reason=REGISTRATION_CLOSED",
      );
    });
  });
});

describe("VerifyEmail", () => {
  it("FE-5 posts the token once and shows the done state", async () => {
    let calls = 0;
    server.use(
      http.post("*/api/auth/email/verify", () => {
        calls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    window.history.replaceState(null, "", "/verify-email#token=t1");
    renderWithIntl(<VerifyEmail />);
    expect(
      await screen.findByRole("heading", { name: "Email verified" }),
    ).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it("FE-5 shows the expired state for TOKEN_INVALID", async () => {
    server.use(
      http.post("*/api/auth/email/verify", () =>
        HttpResponse.json(
          {
            error: {
              code: "X",
              message: "x",
              meta: { reason: "TOKEN_INVALID" },
            },
          },
          { status: 400 },
        ),
      ),
    );
    window.history.replaceState(null, "", "/verify-email#token=old");
    renderWithIntl(<VerifyEmail />);
    expect(
      await screen.findByRole("heading", {
        name: "This link has expired or was already used",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend email" })).toBeDisabled();
  });
});

describe("ResendButton", () => {
  it("FE-4 waits 60 seconds after a send", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let sent: unknown;
      server.use(
        http.post("*/api/auth/email/resend", async ({ request }) => {
          sent = await request.json();
          return HttpResponse.json({}, { status: 202 });
        }),
      );
      renderWithIntl(<ResendButton email="rina@example.com" />);
      await userEvent
        .setup({ advanceTimers: vi.advanceTimersByTime })
        .click(screen.getByRole("button", { name: "Resend email" }));
      expect(
        await screen.findByRole("button", { name: "Resend in 60 seconds" }),
      ).toBeDisabled();
      expect(sent).toEqual({ email: "rina@example.com" });
      await act(() => vi.advanceTimersByTimeAsync(61_000));
      expect(
        screen.getByRole("button", { name: "Resend email" }),
      ).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });
});
