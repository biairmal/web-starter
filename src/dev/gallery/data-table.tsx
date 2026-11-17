"use client";

import { Archive, Copy, Download, Eye, Trash2 } from "lucide-react";
import { useFormatter } from "next-intl";
import { Suspense, useState } from "react";
import {
  type DataTableColumn,
  DataTable,
} from "@/components/data-table/data-table";
import { RowActions } from "@/components/data-table/row-actions";
import {
  type RowSelection,
  NO_SELECTION,
  useRowSelection,
} from "@/components/data-table/selection";
import { useListParams } from "@/components/data-table/use-list-params";
import { toast } from "@/components/feedback/toast";
import { FilterBar } from "@/components/filters/filter-bar";
import type { FilterDef } from "@/components/filters/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/typography";
import {
  COUNTRIES,
  fakePeopleFetcher,
  type Order,
  resolvePeople,
  useFakeOrders,
} from "../fixtures";
import { Demo, Section } from "./section";

const STATUS_BADGE = {
  paid: "positive",
  pending: "warning",
  refunded: "neutral",
  failed: "negative",
} as const;

const people = fakePeopleFetcher();

/** One of each filter type, all filtered by the fake server in fixtures.ts. */
const ORDER_FILTERS: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    type: "multiSelect",
    options: [
      { value: "paid", label: "Paid" },
      { value: "pending", label: "Pending" },
      { value: "refunded", label: "Refunded" },
      { value: "failed", label: "Failed" },
    ],
  },
  {
    key: "region",
    label: "Region",
    type: "select",
    options: COUNTRIES.map((c) => ({ value: c.label, label: c.label })),
  },
  {
    key: "owner",
    label: "Owner",
    type: "async",
    fetchOptions: people,
    resolveLabels: resolvePeople,
    multiple: true,
  },
  { key: "created_at", label: "Created", type: "dateRange" },
  {
    key: "amount",
    label: "Amount",
    type: "number",
    formatValue: (value) =>
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: "USD",
      }).format(value),
  },
  { key: "customer", label: "Customer", type: "text" },
];

function describe(selection: RowSelection) {
  return selection.allMatching
    ? "every matching order"
    : `${String(selection.ids.length)} orders`;
}

function OrdersDemo() {
  const format = useFormatter();
  // Sort and page live in the URL, so the address bar shows repeated `sort`.
  const list = useListParams({
    filters: ["search", ...ORDER_FILTERS.map((def) => def.key)],
    searchKey: "search",
    defaultSize: 25,
  });
  const orders = useFakeOrders(list.params);
  // A selection made under one filter never carries into another.
  const [selection, setSelection] = useRowSelection(
    JSON.stringify(list.params.filters),
  );

  const columns: DataTableColumn<Order>[] = [
    {
      id: "order",
      header: "Order",
      cell: (order) => <span className="font-medium">{order.id}</span>,
      pin: "start",
      width: 120,
    },
    {
      id: "customer",
      header: "Customer",
      sortField: "customer",
      cell: (order) => order.customer,
    },
    {
      id: "status",
      header: "Status",
      sortField: "status",
      cell: (order) => (
        <Badge variant={STATUS_BADGE[order.status]} dot>
          {order.status}
        </Badge>
      ),
    },
    { id: "region", header: "Region", cell: (order) => order.region },
    { id: "channel", header: "Channel", cell: (order) => order.channel },
    { id: "owner", header: "Owner", cell: (order) => order.owner },
    {
      id: "items",
      header: "Items",
      align: "end",
      cell: (order) => format.number(order.items),
    },
    {
      id: "amount",
      header: "Amount",
      sortField: "amount",
      align: "end",
      cell: (order) =>
        format.number(order.amount, { style: "currency", currency: "USD" }),
    },
    {
      id: "created",
      header: "Created",
      sortField: "created_at",
      align: "end",
      cell: (order) =>
        format.dateTime(new Date(order.created_at), { dateStyle: "medium" }),
    },
    {
      id: "actions",
      header: <span className="sr-only">{"Actions"}</span>,
      align: "end",
      pin: "end",
      width: 88,
      cell: (order) => (
        <RowActions
          name={order.id}
          inline={1}
          actions={[
            {
              id: "view",
              label: "View",
              icon: Eye,
              onSelect: () => toast.info(`Viewing ${order.id}`),
            },
            {
              id: "duplicate",
              label: "Duplicate",
              icon: Copy,
              onSelect: () => toast.success(`Duplicated ${order.id}`),
            },
            {
              id: "archive",
              label: "Archive",
              icon: Archive,
              onSelect: () => toast.success(`Archived ${order.id}`),
            },
            {
              id: "delete",
              label: "Delete",
              icon: Trash2,
              destructive: true,
              onSelect: () => toast.success(`Deleted ${order.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-stack-sm">
      <FilterBar
        search={{
          value: list.search.value,
          onChange: list.search.onChange,
          label: "Search customers",
          loading: orders.isFetching && list.search.value !== "",
        }}
        filters={ORDER_FILTERS}
        values={list.params.filters}
        onChange={(key, value) => {
          list.setFilter(key, value);
        }}
        onClear={list.clearFilters}
      />
      <Text variant="mono" className="break-all text-muted-foreground">
        {JSON.stringify({ sort: list.params.sort, ...list.params.filters })}
      </Text>
      <DataTable
        columns={columns}
        query={orders}
        getRowId={(order) => order.id}
        getRowLabel={(order) => order.id}
        caption="Orders"
        errorTitle="Couldn't load orders."
        empty={<p>{"No orders match these filters"}</p>}
        sort={list.params.sort}
        onSortChange={list.setSort}
        multiSort
        contained
        selectable="multiple"
        selection={selection}
        onSelectionChange={setSelection}
        bulkActions={(chosen) => (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success(`Exported ${describe(chosen)}`)}
            >
              <Download aria-hidden="true" />
              {"Export"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              onClick={() => {
                toast.success(`Deleted ${describe(chosen)}`);
                setSelection(NO_SELECTION);
              }}
            >
              <Trash2 aria-hidden="true" />
              {"Delete"}
            </Button>
          </>
        )}
        onRowClick={(order) => toast.info(`Opened ${order.id}`)}
        onPageChange={list.setPage}
        onSizeChange={list.setSize}
        mobileCard={(order) => ({
          title: order.id,
          value: format.number(order.amount, {
            style: "currency",
            currency: "USD",
          }),
          meta: [order.customer, order.status, order.created_at],
        })}
      />
    </div>
  );
}

function SingleDemo() {
  const [selection, setSelection] = useState<RowSelection>(NO_SELECTION);
  const orders = useFakeOrders({ page: 1, size: 25, filters: {} });
  return (
    <div className="flex w-full min-w-0 flex-col gap-stack-sm">
      <DataTable
        columns={[
          {
            id: "order",
            header: "Order",
            identity: true,
            cell: (order) => order.id,
          },
          { id: "customer", header: "Customer", cell: (o) => o.customer },
          { id: "region", header: "Region", cell: (o) => o.region },
        ]}
        query={orders}
        getRowId={(order) => order.id}
        caption="Pick one order"
        errorTitle="Couldn't load orders."
        empty={<p>{"No orders"}</p>}
        density="compact"
        contained
        selectable="single"
        selection={selection}
        onSelectionChange={setSelection}
        onPageChange={() => undefined}
        onSizeChange={() => undefined}
        mobileCard={(order) => ({ title: order.id, meta: [order.customer] })}
      />
      <Text variant="mono" className="text-muted-foreground">
        {JSON.stringify(selection.ids)}
      </Text>
    </div>
  );
}

export function DataTables() {
  return (
    <Section
      id="data-table"
      title="Data table"
      source="src/components/data-table/ (fake 10,000 orders: src/dev/fixtures.ts)"
    >
      <Demo label="Filters of every type, multi-sort (shift-click), selection with bulk bar, pinned columns, row actions, row click">
        <Suspense>
          <OrdersDemo />
        </Suspense>
      </Demo>
      <Demo label="Single selection, compact">
        <SingleDemo />
      </Demo>
    </Section>
  );
}
