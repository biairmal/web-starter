// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";

// The shadcn primitives share one set of interaction states: a hover border,
// the accent focus ring, and no cursor of their own (the base layer in
// globals.css sets pointer and not-allowed).

describe("form controls", () => {
  it("Input shows a hover border and the accent focus ring", () => {
    render(<Input aria-label="Email" />);
    const { className } = screen.getByRole("textbox", { name: "Email" });
    expect(className).toContain("enabled:hover:border-faint");
    expect(className).toContain("focus-visible:ring-3");
  });

  it("Input keeps its disabled styling", () => {
    render(<Input aria-label="Email" disabled />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toBeDisabled();
    expect(input.className).toContain("disabled:opacity-50");
  });

  it("SelectTrigger shows a hover border", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Role">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Role" }).className).toContain(
      "enabled:hover:border-faint",
    );
  });

  it("Checkbox fills with the accent when checked and has a focus ring", () => {
    render(<Checkbox aria-label="Remember me" />);
    const { className } = screen.getByRole("checkbox", { name: "Remember me" });
    expect(className).toContain("data-checked:bg-primary");
    expect(className).toContain("focus-visible:ring-3");
  });

  it("Label leaves the cursor to the base layer", () => {
    render(<Label htmlFor="x">{"Name"}</Label>);
    expect(screen.getByText("Name").className).not.toContain("cursor-default");
  });
});
