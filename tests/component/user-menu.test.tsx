// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserMenu } from "@/components/layout/user-menu";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("UserMenu", () => {
  it("shows a tinted initials avatar and a trigger with a focus ring", () => {
    renderSignedIn(<UserMenu />, {
      ...meFixture,
      display_name: "Dina Pratama",
    });
    const trigger = screen.getByRole("button", { name: /Dina Pratama/ });
    expect(trigger.className).toContain("focus-visible:ring-2");
    expect(trigger.className).not.toContain("cursor-");
    const avatar = screen.getByText("DP").closest('[data-slot="avatar"]');
    expect(avatar).toHaveAttribute("aria-hidden", "true");
    expect(avatar?.className).toContain("bg-active");
  });

  it("truncates a very long display name and keeps it whole in a title", () => {
    const long = "Maximilian Alexander von Hohenzollern-Sigmaringen III";
    renderSignedIn(<UserMenu />, { ...meFixture, display_name: long });
    const name = screen.getByText(long, { selector: "span.truncate" });
    expect(name).toHaveAttribute("title", long);
  });
});
