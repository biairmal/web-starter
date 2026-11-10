// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  type DataTableColumn,
  DataTable,
  type PageQuery,
} from "@/components/data-table/data-table";
import { MobileCards } from "@/components/data-table/mobile-cards";
import { ApiError } from "@/lib/api/errors";
import type { Page } from "@/lib/api/types";
import { renderWithIntl } from "../helpers/intl";

type Person = { id: string; name: string; role: string; joined: string };

const people: Person[] = [
  { id: "1", name: "Dina Pratama", role: "Manager", joined: "3 Oct" },
  { id: "2", name: "Ari Wibowo", role: "Member", joined: "12 Oct" },
];

const page: Page<Person> = {
  items: people,
  total: 48,
  page: 1,
  size: 25,
  total_pages: 2,
  has_prev: false,
  has_next: true,
};

const columns: DataTableColumn<Person>[] = [
  {
    id: "name",
    header: "Name",
    cell: (row) => row.name,
    sortField: "display_name",
    identity: true,
  },
  { id: "role", header: "Role", cell: (row) => row.role },
];

function query(overrides: Partial<PageQuery<Person>> = {}): PageQuery<Person> {
  return {
    data: page,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

function renderTable(
  q: PageQuery<Person>,
  handlers: Partial<{
    onSortChange: (sort: string | undefined) => void;
    onPageChange: (page: number) => void;
  }> = {},
  sort?: string,
) {
  return renderWithIntl(
    <DataTable
      columns={columns}
      query={q}
      getRowId={(row) => row.id}
      mobileCard={(row) => ({
        title: row.name,
        meta: [row.role, row.joined],
        action: <button type="button">{`Actions for ${row.name}`}</button>,
      })}
      caption="Users"
      errorTitle="Couldn't load users."
      empty={<p>{"No one has been invited yet"}</p>}
      sort={sort}
      onSortChange={handlers.onSortChange ?? vi.fn()}
      onPageChange={handlers.onPageChange ?? vi.fn()}
      onSizeChange={vi.fn()}
    />,
  );
}

describe("MobileCards", () => {
  it("FE-NFR-4 shows each row as two lines and keeps every field", () => {
    renderWithIntl(
      <MobileCards
        rows={people}
        getRowId={(row) => row.id}
        label="Users"
        card={(row) => ({
          title: row.name,
          value: row.role,
          meta: [row.joined, "", undefined],
          action: <button type="button">{`Open ${row.name}`}</button>,
        })}
      />,
    );
    const list = screen.getByRole("list", { name: "Users" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    const first = items[0];
    if (!first) {
      throw new Error("no first row");
    }
    expect(first).toHaveTextContent("Dina Pratama");
    expect(first).toHaveTextContent("Manager");
    expect(first).toHaveTextContent("3 Oct");
    // Empty fields are skipped, so no dangling separator.
    expect(first.textContent).not.toMatch(/·\s*$/);
    expect(
      within(first).getByRole("button", { name: "Open Dina Pratama" }),
    ).toBeInTheDocument();
  });
});

describe("DataTable", () => {
  it("renders the table and the phone card list from the same page", () => {
    renderTable(query());
    const table = screen.getByRole("table", { name: "Users" });
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    const cards = screen.getByRole("list", { name: "Users" });
    expect(within(cards).getAllByRole("listitem")).toHaveLength(2);
    expect(within(cards).getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("1–25 of 48")).toBeInTheDocument();
  });

  it("marks the sorted column and toggles its sort", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderTable(query(), { onSortChange }, "display_name,ASC");
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header).toHaveAttribute("aria-sort", "ascending");
    await user.click(within(header).getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith("display_name,DESC");
    expect(
      screen.getByRole("columnheader", { name: "Role" }),
    ).not.toHaveAttribute("aria-sort");
  });

  it("pages forward", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderTable(query(), { onPageChange });
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("shows loading rows with the headers already in place", () => {
    renderTable(query({ data: undefined, isPending: true }));
    expect(
      screen.getByRole("columnheader", { name: /Name/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dina Pratama")).toBeNull();
  });

  it("shows the empty state when the page has no rows", () => {
    renderTable(query({ data: { ...page, items: [], total: 0 } }));
    expect(screen.getByText("No one has been invited yet")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Users" })).toBeNull();
  });

  it("shows the error in place with the request ID and a retry", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    renderTable(
      query({
        data: undefined,
        isError: true,
        error: new ApiError({ status: 503, requestId: "req-42" }),
        refetch,
      }),
    );
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load users.");
    expect(alert).toHaveTextContent("Request ID req-42");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
