// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { X } from "lucide-react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type DataTableColumn,
  DataTable,
  type PageQuery,
} from "@/components/data-table/data-table";
import { MobileCards } from "@/components/data-table/mobile-cards";
import { RowActions } from "@/components/data-table/row-actions";
import {
  NO_SELECTION,
  type RowSelection,
} from "@/components/data-table/selection";
import type { SortValue } from "@/components/data-table/use-list-params";
import { ApiError } from "@/lib/api/errors";
import type { Page } from "@/lib/api/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderWithIntl } from "../helpers/intl";

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

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
    onSortChange: (sort: SortValue) => void;
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

function table() {
  return screen.getByRole("table", { name: "Users" });
}

function renderPlain(
  props: Partial<React.ComponentProps<typeof DataTable<Person>>>,
) {
  return renderWithIntl(
    <DataTable
      columns={columns}
      query={query()}
      getRowId={(row) => row.id}
      mobileCard={(row) => ({ title: row.name })}
      caption="Users"
      errorTitle="Failed"
      empty={null}
      onPageChange={vi.fn()}
      onSizeChange={vi.fn()}
      {...props}
    />,
  );
}

describe("DataTable multi-sort", () => {
  const sortable: DataTableColumn<Person>[] = [
    {
      id: "name",
      header: "Name",
      cell: (r) => r.name,
      sortField: "display_name",
    },
    { id: "role", header: "Role", cell: (r) => r.role, sortField: "role" },
  ];

  it("adds a column on shift-click and shows each column's priority", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    renderPlain({
      columns: sortable,
      multiSort: true,
      sort: ["display_name,ASC", "role,DESC"],
      onSortChange,
    });
    const role = screen.getByRole("columnheader", { name: /Role/ });
    expect(role).toHaveAttribute("aria-sort", "descending");
    expect(role).toHaveTextContent("sort 2");
    await user.keyboard("{Shift>}");
    await user.click(within(role).getByRole("button"));
    await user.keyboard("{/Shift}");
    // Shift on a descending column drops it from the sort.
    expect(onSortChange).toHaveBeenLastCalledWith(["display_name,ASC"]);
    await user.click(
      within(screen.getByRole("columnheader", { name: /Name/ })).getByRole(
        "button",
      ),
    );
    // A plain click sorts by that column alone.
    expect(onSortChange).toHaveBeenLastCalledWith(["display_name,ASC"]);
  });
});

function Selectable({ onRowClick }: { onRowClick?: (row: Person) => void }) {
  const [selection, setSelection] = useState<RowSelection>(NO_SELECTION);
  return (
    <>
      <DataTable
        columns={columns}
        query={query()}
        getRowId={(row) => row.id}
        getRowLabel={(row) => row.name}
        mobileCard={(row) => ({ title: row.name })}
        caption="Users"
        errorTitle="Failed"
        empty={null}
        selectable="multiple"
        selection={selection}
        onSelectionChange={setSelection}
        bulkActions={() => <button type="button">{"Delete"}</button>}
        {...(onRowClick ? { onRowClick } : {})}
        onPageChange={vi.fn()}
        onSizeChange={vi.fn()}
      />
      <output>{JSON.stringify(selection)}</output>
    </>
  );
}

describe("DataTable selection", () => {
  it("selects the page, then every matching row, and drops back to ids", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Selectable />);
    await user.click(
      within(table()).getByRole("checkbox", {
        name: "Select all rows on this page",
      }),
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Select all 48 matching" }),
    );
    expect(screen.getByText("48 selected")).toBeInTheDocument();
    const output = document.querySelector("output");
    expect(output).toHaveTextContent('{"ids":[],"allMatching":true}');
    await user.click(
      within(table()).getByRole("checkbox", { name: "Select Ari Wibowo" }),
    );
    expect(output).toHaveTextContent('{"ids":["1"],"allMatching":false}');
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it("shows the page checkbox as mixed when some rows are chosen", async () => {
    const user = userEvent.setup();
    renderWithIntl(<Selectable />);
    await user.click(
      within(table()).getByRole("checkbox", { name: "Select Dina Pratama" }),
    );
    expect(
      within(table()).getByRole("checkbox", {
        name: "Select all rows on this page",
      }),
    ).toHaveAttribute("aria-checked", "mixed");
  });
});

describe("DataTable row click", () => {
  it("opens a row on click or Enter, but not from its checkbox", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderWithIntl(<Selectable onRowClick={onRowClick} />);
    await user.click(within(table()).getByText("Dina Pratama"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    await user.click(
      within(table()).getByRole("checkbox", { name: "Select Dina Pratama" }),
    );
    expect(onRowClick).toHaveBeenCalledTimes(1);
    within(table()).getByText("Ari Wibowo").closest("tr")?.focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenLastCalledWith(people[1]);
  });

  it("navigates to rowHref", async () => {
    const user = userEvent.setup();
    fakeRouter.reset("/users");
    renderPlain({ rowHref: (row) => `/users/${row.id}` });
    await user.click(within(table()).getByText("Ari Wibowo"));
    expect(fakeRouter.url).toBe("/users/2");
  });
});

describe("DataTable pinned columns", () => {
  it("keeps pinned cells at their offsets", () => {
    renderPlain({
      columns: [
        {
          id: "name",
          header: "Name",
          cell: (r) => r.name,
          pin: "start",
          width: 120,
        },
        {
          id: "role",
          header: "Role",
          cell: (r) => r.role,
          pin: "end",
          width: 80,
        },
      ],
      selectable: "multiple",
    });
    const name = within(table()).getByText("Dina Pratama").closest("td");
    // After the 40px checkbox column, which is pinned with it.
    expect(name).toHaveStyle({ insetInlineStart: "40px", width: "120px" });
    const role = within(table()).getByText("Manager").closest("td");
    expect(role).toHaveStyle({ insetInlineEnd: "0px" });
  });
});

describe("RowActions", () => {
  it("shows inline actions as buttons and the rest in a menu", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithIntl(
      <RowActions
        name="Ayu"
        inline={1}
        actions={[
          { id: "view", label: "View", icon: X, onSelect: vi.fn() },
          {
            id: "delete",
            label: "Delete",
            destructive: true,
            onSelect: onDelete,
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions for Ayu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
