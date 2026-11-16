// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

describe("Popover", () => {
  it("floats with the shared shadow and sets no cursor of its own", () => {
    render(
      <Popover open>
        <PopoverTrigger>{"Open"}</PopoverTrigger>
        <PopoverContent>{"Body"}</PopoverContent>
      </Popover>,
    );
    const { className } = screen.getByRole("dialog");
    expect(className).toContain("shadow-float");
    expect(className).not.toContain("cursor-");
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>{"Open"}</PopoverTrigger>
        <PopoverContent>{"Body"}</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
