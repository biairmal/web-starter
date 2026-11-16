// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterTabs } from "@/components/filters/filter-tabs";

const options = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

describe("FilterTabs", () => {
  it("is a named group of buttons, the current one pressed", () => {
    render(
      <FilterTabs
        label="Status"
        value="active"
        options={options}
        onChange={vi.fn()}
      />,
    );
    const group = screen.getByRole("group", { name: "Status" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports the value of the tab clicked, with an empty string for All", async () => {
    const onChange = vi.fn();
    render(
      <FilterTabs
        label="Status"
        value="active"
        options={options}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("underlines the current tab with the accent", () => {
    render(
      <FilterTabs
        label="Status"
        value="archived"
        options={options}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Archived" }).className,
    ).toContain("border-brand-accent");
  });

  it("cannot scroll vertically: nothing overlaps the rule below the tabs", () => {
    render(
      <FilterTabs
        label="Status"
        value=""
        options={options}
        onChange={vi.fn()}
      />,
    );
    const group = screen.getByRole("group", { name: "Status" });
    expect(group.className).toContain("overflow-x-auto");
    expect(group.className).toContain("overflow-y-hidden");
    expect(group.className).toContain("shadow-rule-inset");
    expect(group.className).not.toContain("border-b");
    for (const tab of screen.getAllByRole("button")) {
      expect(tab.className).not.toContain("-mb-px");
    }
  });
});
