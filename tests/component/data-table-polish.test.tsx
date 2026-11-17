// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type DataTableColumn,
  DataTable,
  type PageQuery,
} from "@/components/data-table/data-table";
import type { Page } from "@/lib/api/types";
import { renderWithIntl } from "../helpers/intl";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

type Person = { id: string; name: string };

const page: Page<Person> = {
  items: [{ id: "1", name: "Dina Pratama" }],
  total: 1,
  page: 1,
  size: 25,
  total_pages: 1,
  has_prev: false,
  has_next: false,
};

const columns: DataTableColumn<Person>[] = [
  { id: "name", header: "Name", cell: (row) => row.name, sortField: "name" },
  {
    id: "actions",
    header: "Actions",
    cell: () => <button type="button">{"Open menu"}</button>,
    rowActions: true,
  },
];

const query: PageQuery<Person> = {
  data: page,
  isPending: false,
  isError: false,
  error: null,
  refetch: vi.fn(),
};

function renderTable(density?: "comfortable" | "compact") {
  return renderWithIntl(
    <DataTable
      columns={columns}
      query={query}
      getRowId={(row) => row.id}
      mobileCard={(row) => ({ title: row.name, meta: [] })}
      caption="People"
      errorTitle="Couldn't load."
      empty={<p>{"Nobody"}</p>}
      onSortChange={vi.fn()}
      onPageChange={vi.fn()}
      onSizeChange={vi.fn()}
      {...(density ? { density } : {})}
    />,
  );
}

describe("DataTable polish", () => {
  it("reveals a row-actions cell on hover or focus, and always on touch", () => {
    renderTable();
    const row = screen.getAllByRole("row")[1];
    const button = within(row as HTMLElement).getByRole("button", {
      name: "Open menu",
    });
    // The content fades, not the cell, so a pinned cell keeps its background.
    expect(button.closest("td")?.className).not.toContain("opacity-0");
    const className = button.parentElement?.className ?? "";
    expect(className).toContain("opacity-0");
    expect(className).toContain("group-hover/row:opacity-100");
    expect(className).toContain("group-focus-within/row:opacity-100");
    expect(className).toContain("pointer-coarse:opacity-100");
  });

  it("rows are comfortable by default and compact on request", () => {
    const { unmount } = renderTable();
    expect(screen.getAllByRole("row")[1]?.className).toContain("h-12");
    unmount();
    renderTable("compact");
    expect(screen.getAllByRole("row")[1]?.className).toContain("h-9");
  });

  it("marks a sortable, unsorted header with a decorative icon and keeps its name", () => {
    renderTable();
    const button = screen.getByRole("button", { name: "Name" });
    const icon = button.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the header in view while the page scrolls", () => {
    renderTable();
    const head = screen.getAllByRole("rowgroup")[0];
    expect(head?.className).toContain("sticky");
    // The rule is drawn by each header cell, so it moves with the header.
    expect(head?.querySelector("th")?.className).toContain("shadow-rule-inset");
  });
});
