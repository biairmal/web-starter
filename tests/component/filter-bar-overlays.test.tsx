// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

/** A list that holds the values, as useListParams does through the URL. */
function Harness({
  initial,
  onChange,
  filters = [role, status],
}: {
  initial: Record<string, string>;
  onChange: (key: string, value: string) => void;
  filters?: readonly FilterDef[];
}) {
  const [values, setValues] = useState(initial);
  return (
    <FilterBar
      filters={filters}
      values={values}
      onChange={(key, value) => {
        onChange(key, value);
        setValues((current) => {
          const rest = Object.fromEntries(
            Object.entries(current).filter(([name]) => name !== key),
          );
          return value ? { ...rest, [key]: value } : rest;
        });
      }}
      onClear={() => {
        setValues({});
      }}
    />
  );
}

function stubNarrowViewport() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FilterBar overlays", () => {
  it("adds a filter from a popover: pick the filter, then its value", async () => {
    const onChange = vi.fn();
    renderWithIntl(<Harness initial={{}} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
    expect(screen.getByRole("button", { name: "Role" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Role" }));
    await userEvent.click(screen.getByRole("button", { name: "Sales" }));
    expect(onChange).toHaveBeenCalledWith("role", "r1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Role: Sales" })).toHaveFocus();
  });

  it("uses a bottom sheet on a narrow viewport", async () => {
    stubNarrowViewport();
    renderWithIntl(<Harness initial={{}} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Add filter" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "sheet-content");
    expect(dialog).toHaveAttribute("data-side", "bottom");
  });

  it("closes on Escape and returns focus to the button that opened it", async () => {
    renderWithIntl(<Harness initial={{}} onChange={vi.fn()} />);
    const add = screen.getByRole("button", { name: "Add filter" });
    await userEvent.click(add);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(add).toHaveFocus();
  });

  it("opens a pill's editor with the current value selected", async () => {
    renderWithIntl(<Harness initial={{ role: "r1" }} onChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Role: Sales" }));
    expect(screen.getByRole("button", { name: "Sales" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Manager" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("changes a value from its pill", async () => {
    const onChange = vi.fn();
    renderWithIntl(<Harness initial={{ role: "r1" }} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Role: Sales" }));
    await userEvent.click(screen.getByRole("button", { name: "Manager" }));
    expect(onChange).toHaveBeenCalledWith("role", "r2");
    expect(screen.getByRole("button", { name: "Role: Manager" })).toHaveFocus();
  });

  it("moves focus to the next pill when one is removed", async () => {
    renderWithIntl(
      <Harness initial={{ role: "r1", status: "active" }} onChange={vi.fn()} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Remove filter Role" }),
    );
    expect(
      screen.getByRole("button", { name: "Status: Active" }),
    ).toHaveFocus();
  });

  it("moves focus to Add filter when the last pill is removed", async () => {
    renderWithIntl(<Harness initial={{ role: "r1" }} onChange={vi.fn()} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove filter Role" }),
    );
    expect(screen.getByRole("button", { name: "Add filter" })).toHaveFocus();
  });

  it("focuses Add filter, which reappears, when the last pill of several is removed", async () => {
    renderWithIntl(
      <Harness initial={{ role: "r1", status: "active" }} onChange={vi.fn()} />,
    );
    // Add filter is hidden while every filter is applied.
    expect(
      screen.queryByRole("button", { name: "Add filter" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove filter Status" }),
    );
    expect(screen.getByRole("button", { name: "Add filter" })).toHaveFocus();
  });

  it("does not drop focus when an editor clears the value it is editing", async () => {
    const custom: FilterDef = {
      key: "who",
      label: "Who",
      type: "custom",
      renderValue: (value) => value,
      renderEditor: ({ onChange }) => (
        <button
          type="button"
          onClick={() => {
            onChange("");
          }}
        >
          {"Clear who"}
        </button>
      ),
    };
    renderWithIntl(
      <Harness
        initial={{ who: "dina", status: "active" }}
        onChange={vi.fn()}
        filters={[custom, status]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Who: dina" }));
    await userEvent.click(screen.getByRole("button", { name: "Clear who" }));
    expect(
      screen.getByRole("button", { name: "Status: Active" }),
    ).toHaveFocus();
  });
});
