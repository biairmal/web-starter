// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders an accessible button with its label", () => {
    render(<Button>{"Save"}</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("keeps the primary variant on design tokens, not a fixed colour", () => {
    render(<Button>{"Submit"}</Button>);
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).not.toMatch(/#[0-9a-f]{3,6}/i);
  });

  it("darkens the accent on hover and press with the derived tokens", () => {
    render(<Button>{"Submit"}</Button>);
    const { className } = screen.getByRole("button", { name: "Submit" });
    expect(className).toContain("hover:bg-primary-hover");
    expect(className).toContain("active:bg-primary-press");
    expect(className).not.toContain("hover:bg-primary/80");
  });

  it("drops the press scale and transition under reduced motion", () => {
    render(<Button>{"Submit"}</Button>);
    const { className } = screen.getByRole("button", { name: "Submit" });
    expect(className).toContain("motion-reduce:transition-none");
    expect(className).toContain("motion-reduce:active:scale-100");
  });

  it("colours the link variant with the accent token", () => {
    render(<Button variant="link">{"More"}</Button>);
    expect(screen.getByRole("button", { name: "More" }).className).toContain(
      "text-brand-accent",
    );
  });

  it("keeps the destructive variant on the destructive token", () => {
    render(<Button variant="destructive">{"Delete"}</Button>);
    expect(screen.getByRole("button", { name: "Delete" }).className).toContain(
      "text-destructive",
    );
  });

  it("is disabled when asked, and lets the not-allowed cursor show", () => {
    render(<Button disabled>{"Save"}</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    // pointer-events-none would hide the base layer's not-allowed cursor.
    expect(button.className).not.toContain("disabled:pointer-events-none");
  });

  // Without pointer-events-none a disabled button still matches :hover and
  // :active, so every hover and pressed style must be scoped to enabled ones
  // (not-disabled, not enabled, so a button rendered as a link keeps them).
  it.each([
    "default",
    "outline",
    "secondary",
    "ghost",
    "destructive",
    "link",
  ] as const)(
    "the %s variant scopes hover and pressed styles to enabled buttons",
    (variant) => {
      render(
        <Button variant={variant} disabled>
          {"Save"}
        </Button>,
      );
      const unscoped = screen
        .getByRole("button", { name: "Save" })
        .className.split(/\s+/)
        .filter((token) => /(^|:)(hover|active):/.test(token))
        .filter((token) => !token.includes("not-disabled:"))
        // The reduced-motion reset only removes a style, so it needs no guard.
        .filter((token) => !token.startsWith("motion-reduce:"));
      expect(unscoped).toEqual([]);
    },
  );
});
