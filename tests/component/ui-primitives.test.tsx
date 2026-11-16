// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";

// The shadcn primitives share one set of interaction states: a hover border,
// the accent focus ring, and no cursor of their own (the base layer in
// globals.css sets pointer and not-allowed).

describe("form controls", () => {
  it("Input shows a hover border and the accent focus ring", () => {
    render(<Input aria-label="Email" />);
    const { className } = screen.getByRole("textbox", { name: "Email" });
    expect(className).toContain("hover:border-faint");
    // `enabled:hover:` has higher specificity than the focus and invalid
    // borders and would hide them while the mouse is over the field.
    expect(className).not.toContain("enabled:hover");
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
      "hover:border-faint",
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

describe("menus and overlays", () => {
  it("a menu item takes the accent tint on focus and sets no cursor", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>{"Open"}</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>{"Rename"}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const { className } = screen.getByRole("menuitem", { name: "Rename" });
    expect(className).toContain("focus:bg-accent");
    expect(className).not.toContain("cursor-");
  });

  it("a dialog floats with the shared shadow and keeps its Close button", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>{"Invite"}</DialogTitle>
          <DialogDescription>{"Send an invite"}</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog").className).toContain("shadow-float");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("Badge uses the derived accent hover and a token link colour", () => {
    render(
      <>
        <Badge>{"New"}</Badge>
        <Badge variant="link">{"Docs"}</Badge>
      </>,
    );
    const base = screen.getByText("New").className;
    expect(base).toContain("[a]:hover:bg-primary-hover");
    expect(base).not.toMatch(/#[0-9a-f]{3,6}/i);
    expect(screen.getByText("Docs").className).toContain("text-brand-accent");
  });

  it("Skeleton stops pulsing under reduced motion", () => {
    const { container } = render(<Skeleton />);
    const { className } = container.firstElementChild as HTMLElement;
    expect(className).toContain("animate-pulse");
    expect(className).toContain("motion-reduce:animate-none");
  });
});
