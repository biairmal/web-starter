// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/filters/filter-bar";
import type { FilterDef } from "@/components/filters/filters";
import { renderWithIntl } from "../helpers/intl";

const role: FilterDef = {
  key: "role",
  label: "Role",
  type: "select",
  options: [
    { value: "r1", label: "Sales" },
    { value: "r2", label: "Manager" },
  ],
};
const status: FilterDef = {
  key: "status",
  label: "Status",
  type: "select",
  options: [{ value: "active", label: "Active" }],
};

function setup(
  values: Record<string, string>,
  filters: readonly FilterDef[] = [role, status],
) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const onSearchChange = vi.fn();
  renderWithIntl(
    <FilterBar
      search={{
        value: "",
        onChange: onSearchChange,
        label: "Search by name",
      }}
      filters={filters}
      values={values}
      onChange={onChange}
      onClear={onClear}
    />,
  );
  return { onChange, onClear, onSearchChange };
}

describe("FilterBar: search, pills, clear", () => {
  it("renders a search box with its accessible name and reports typing", async () => {
    const { onSearchChange } = setup({});
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search by name" }),
      "a",
    );
    expect(onSearchChange).toHaveBeenCalledWith("a");
  });

  it("shows one pill per applied filter with the option's label", () => {
    setup({ role: "r1" });
    expect(
      screen.getByRole("button", { name: "Role: Sales" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Status:/ }),
    ).not.toBeInTheDocument();
  });

  it("removes a filter from its pill", async () => {
    const { onChange } = setup({ role: "r1" });
    await userEvent.click(
      screen.getByRole("button", { name: "Remove filter Role" }),
    );
    expect(onChange).toHaveBeenCalledWith("role", "");
  });

  it("shows a value that matches no option as it is, and still removes it", async () => {
    const { onChange } = setup({ role: "deleted-id" });
    expect(
      screen.getByRole("button", { name: "Role: deleted-id" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove filter Role" }),
    );
    expect(onChange).toHaveBeenCalledWith("role", "");
  });

  it("truncates a very long value and keeps the full text in a title", () => {
    const long = "A very long role name ".repeat(3).trim();
    setup({ role: "r9" }, [
      {
        key: "role",
        label: "Role",
        type: "select",
        options: [{ value: "r9", label: long }],
      },
    ]);
    const pill = screen.getByRole("button", { name: `Role: ${long}` });
    expect(pill.className).toContain("truncate");
    expect(pill).toHaveAttribute("title", `Role: ${long}`);
  });

  it("offers no Clear filters while nothing is applied", () => {
    setup({});
    expect(
      screen.queryByRole("button", { name: "Clear filters" }),
    ).not.toBeInTheDocument();
  });

  it("clears every filter from one button", async () => {
    const { onClear } = setup({ role: "r1", status: "active" });
    await userEvent.click(
      screen.getByRole("button", { name: "Clear filters" }),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("offers Add filter while a filter is unset, and not when all are set", () => {
    setup({ role: "r1" });
    expect(
      screen.getByRole("button", { name: "Add filter" }),
    ).toBeInTheDocument();
  });

  it("hides Add filter when every filter has a value", () => {
    setup({ role: "r1", status: "active" });
    expect(
      screen.queryByRole("button", { name: "Add filter" }),
    ).not.toBeInTheDocument();
  });
});
