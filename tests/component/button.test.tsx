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
});
