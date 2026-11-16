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
});
