// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/filters/filter-bar";
import {
  decodeFilter,
  encodeFilter,
  type FilterDef,
} from "@/components/filters/filters";
import { renderWithIntl } from "../helpers/intl";

const status: FilterDef = {
  key: "status",
  label: "Status",
  type: "multiSelect",
  options: [
    { value: "paid", label: "Paid" },
    { value: "pending", label: "Pending" },
    { value: "failed", label: "Failed" },
  ],
};
const amount: FilterDef = { key: "amount", label: "Amount", type: "number" };
const minimum: FilterDef = {
  key: "minimum",
  label: "Minimum",
  type: "number",
  operators: ["gte"],
};
const owner: FilterDef = {
  key: "owner",
  label: "Owner",
  type: "async",
  multiple: true,
  fetchOptions: () =>
    Promise.resolve({
      items: [
        { value: "u_1", label: "Ayu" },
        { value: "u_2", label: "Budi" },
      ],
      has_next: false,
    }),
  resolveLabels: (ids) =>
    Promise.resolve(
      ids.map((id) => ({ value: id, label: id === "u_1" ? "Ayu" : "Budi" })),
    ),
};
const created: FilterDef = {
  key: "created_at",
  label: "Created",
  type: "dateRange",
};

function setup(
  values: Record<string, string>,
  filters: readonly FilterDef[],
  loading = false,
) {
  const onChange = vi.fn();
  renderWithIntl(
    <FilterBar
      search={{ value: "", onChange: vi.fn(), label: "Search", loading }}
      filters={filters}
      values={values}
      onChange={onChange}
      onClear={vi.fn()}
    />,
  );
  return onChange;
}

describe("filter values in the list query format", () => {
  it("encodes and decodes each operator", () => {
    expect(encodeFilter("eq", "paid")).toBe("paid");
    expect(encodeFilter("gte", "100")).toBe("100;gte");
    expect(encodeFilter("in", ["a,b", "c"])).toBe("a%2Cb,c;in");
    expect(decodeFilter("a%2Cb,c;in")).toMatchObject({
      op: "in",
      items: ["a,b", "c"],
    });
    expect(decodeFilter("10,20;between").items).toEqual(["10", "20"]);
    expect(decodeFilter("paid")).toMatchObject({ op: "eq", value: "paid" });
  });

  it("keeps a plain value that ends like an operator", () => {
    const raw = encodeFilter("eq", "rock;like");
    expect(raw).toBe("rock;like;eq");
    expect(decodeFilter(raw)).toMatchObject({ op: "eq", value: "rock;like" });
    expect(decodeFilter("a;b")).toMatchObject({ op: "eq", value: "a;b" });
  });
});

describe("FilterBar filter types", () => {
  it("applies several options at once as an in list", async () => {
    const user = userEvent.setup();
    const onChange = setup({}, [status]);
    await user.click(screen.getByRole("button", { name: "Add filter" }));
    await user.click(screen.getByRole("button", { name: "Status" }));
    await user.click(screen.getByRole("checkbox", { name: "Paid" }));
    await user.click(screen.getByRole("checkbox", { name: "Failed" }));
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith("status", "paid,failed;in");
  });

  it("names applied options and shortens a long list", () => {
    setup({ status: "paid,pending,failed;in" }, [status]);
    expect(
      screen.getByRole("button", { name: "Status: Paid, Pending +1" }),
    ).toBeInTheDocument();
  });

  it("shows the operator in the pill", () => {
    setup({ amount: "100;gte" }, [amount]);
    expect(
      screen.getByRole("button", { name: "Amount at least 100" }),
    ).toBeInTheDocument();
  });

  it("applies a typed number with Enter", async () => {
    const user = userEvent.setup();
    const onChange = setup({}, [minimum]);
    await user.click(screen.getByRole("button", { name: "Add filter" }));
    await user.click(screen.getByRole("button", { name: "Minimum" }));
    await user.type(screen.getByRole("spinbutton", { name: "Minimum" }), "50");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("minimum", "50;gte");
  });

  it("picks several server options and applies them as an in list", async () => {
    const user = userEvent.setup();
    const onChange = setup({}, [owner]);
    await user.click(screen.getByRole("button", { name: "Add filter" }));
    await user.click(screen.getByRole("button", { name: "Owner" }));
    await user.click(await screen.findByRole("option", { name: "Ayu" }));
    await user.click(screen.getByRole("option", { name: "Budi" }));
    expect(screen.getByRole("option", { name: "Ayu" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenCalledWith("owner", "u_1,u_2;in");
  });

  it("names server options from their ids", async () => {
    setup({ owner: "u_1,u_2;in" }, [owner]);
    expect(
      await screen.findByRole("button", { name: "Owner: Ayu, Budi" }),
    ).toBeInTheDocument();
  });

  it("shows a date range as one range", () => {
    setup({ created_at: "2026-11-01,2026-11-17;between" }, [created]);
    expect(
      screen.getByRole("button", { name: /^Created: Nov 1.*17, 2026$/ }),
    ).toBeInTheDocument();
  });

  it("shows a spinner while search results load", () => {
    setup({}, [], true);
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });
});
