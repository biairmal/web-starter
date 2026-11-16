// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/filters/filter-bar";
import type { FilterDef } from "@/components/filters/filters";
import { renderWithIntl } from "../helpers/intl";

// The audit log's From and To are two date filters. The editors take their
// limits from the other value, so a range cannot be entered backwards.

const from: FilterDef = {
  key: "from",
  label: "From",
  type: "date",
  max: "2026-11-10",
};
const to: FilterDef = {
  key: "to",
  label: "To",
  type: "date",
  min: "2026-11-01",
};

function setup(values: Record<string, string>) {
  renderWithIntl(
    <FilterBar
      filters={[from, to]}
      values={values}
      onChange={vi.fn()}
      onClear={vi.fn()}
    />,
  );
}

describe("FilterBar date filters", () => {
  it("limits the From editor to the To date", async () => {
    setup({ to: "2026-11-10" });
    await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
    await userEvent.click(screen.getByRole("button", { name: "From" }));
    expect(
      screen.getByLabelText("From", { selector: "input" }),
    ).toHaveAttribute("max", "2026-11-10");
  });

  it("limits the To editor to the From date", async () => {
    setup({ from: "2026-11-01" });
    await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
    await userEvent.click(screen.getByRole("button", { name: "To" }));
    expect(screen.getByLabelText("To", { selector: "input" })).toHaveAttribute(
      "min",
      "2026-11-01",
    );
  });

  it("shows a date in the viewer's format on its pill", () => {
    setup({ from: "2026-11-10" });
    expect(
      screen.getByRole("button", { name: "From: Nov 10, 2026" }),
    ).toBeInTheDocument();
  });
});
