// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GoogleButton, googleStartUrl } from "@/features/auth/google-button";
import { SignInForm } from "@/features/auth/sign-in-form";
import type { AuthConfig } from "@/lib/api/types";
import { renderWithIntl } from "../helpers/intl";
import { authConfigFixture } from "../msw/handlers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function renderSignIn(config: AuthConfig) {
  return renderWithIntl(
    <QueryClientProvider client={new QueryClient()}>
      <SignInForm next="/" initialConfig={config} />
    </QueryClientProvider>,
  );
}

describe("googleStartUrl", () => {
  it("adds next and tenant only when they matter", () => {
    expect(googleStartUrl("/")).toBe("/api/auth/google/start");
    expect(googleStartUrl("/x?y=1", "acme")).toBe(
      "/api/auth/google/start?next=%2Fx%3Fy%3D1&tenant=acme",
    );
  });
});

describe("GoogleButton", () => {
  it("FE-3 is a plain link to the BFF in single mode", () => {
    renderWithIntl(<GoogleButton next="/admin/users" multi={false} />);
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/auth/google/start?next=%2Fadmin%2Fusers");
  });

  it("FE-3 needs the workspace first in multi mode", async () => {
    renderWithIntl(<GoogleButton next="/" multi />);
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled();
    await userEvent.setup().type(screen.getByLabelText("Workspace"), "Acme");
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/auth/google/start?tenant=acme");
  });

  it("keeps the workspace after TENANT_REQUIRED", () => {
    renderWithIntl(<GoogleButton next="/" multi initialTenant="globex" />);
    expect(screen.getByLabelText("Workspace")).toHaveValue("globex");
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toHaveAttribute("href", "/api/auth/google/start?tenant=globex");
  });
});

describe("SignInForm with Google", () => {
  it("FE-1 hides the button when Google is off", () => {
    renderSignIn(authConfigFixture);
    expect(
      screen.queryByRole("link", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });

  it("FE-1 shows both methods split by a rule", () => {
    renderSignIn({
      ...authConfigFixture,
      providers: { password: true, google: true },
    });
    expect(screen.getByText("or")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("FE-1 shows only Google when password sign-in is off", () => {
    renderSignIn({
      ...authConfigFixture,
      providers: { password: false, google: true },
    });
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });
});
