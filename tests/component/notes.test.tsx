// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Me } from "@/lib/api/types";
import { NotesTable } from "@/features/notes/notes-table";
import type { Note } from "@/features/notes/types";
import { fakeRouter } from "../helpers/fake-router";
import { renderSignedIn } from "../helpers/signed-in";
import { meFixture } from "../msw/handlers";
import { server } from "../msw/server";

// The example business module (FE-62; docs/adding-a-module.md).

vi.mock(
  "next/navigation",
  async () => (await import("../helpers/fake-router")).navigation,
);

const reader: Me = { ...meFixture, permissions: ["notes:read"] };
const writer: Me = {
  ...meFixture,
  permissions: ["notes:read", "notes:write"],
};

const groceries: Note = {
  id: "n1",
  title: "Groceries",
  body: "Milk, eggs",
  status: "draft",
  pinned: true,
  owner_id: meFixture.id,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-02T00:00:00Z",
  version: 3,
};
const ideas: Note = {
  id: "n2",
  title: "Ideas",
  status: "archived",
  pinned: false,
  owner_id: meFixture.id,
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-03T00:00:00Z",
  version: 1,
};

function page(items: Note[]) {
  return {
    data: { items, page: 1, size: 25, total: items.length, total_pages: 1 },
  };
}

function serveList(items: Note[] = [groceries, ideas]) {
  server.use(
    http.get("*/api/notes/notes", () => HttpResponse.json(page(items))),
  );
}

async function openRowMenu(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText("2 notes");
  const table = screen.getByRole("table", { name: "Notes" });
  await user.click(
    within(table).getByRole("button", { name: "Actions for Groceries" }),
  );
}

describe("NotesTable", () => {
  beforeEach(() => {
    fakeRouter.reset("/notes");
  });

  it("FE-62 lists notes through /api/notes with status, pin and total", async () => {
    serveList();
    renderSignedIn(<NotesTable />, reader, "/notes");
    expect(await screen.findByText("2 notes")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Notes" });
    const row = within(table).getByRole("row", { name: /Groceries/ });
    expect(within(row).getByLabelText("Pinned")).toBeInTheDocument();
    expect(within(row).getByText("Draft")).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Ideas/ })).toHaveTextContent(
      "Archived",
    );
  });

  it("without notes:write there is no New note button and no row actions", async () => {
    serveList();
    renderSignedIn(<NotesTable />, reader, "/notes");
    await screen.findByText("2 notes");
    expect(
      screen.queryByRole("button", { name: "New note" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Actions for Groceries" }),
    ).not.toBeInTheDocument();
  });

  it("status tab and search live in the URL and go to the API", async () => {
    const seen: URLSearchParams[] = [];
    server.use(
      http.get("*/api/notes/notes", ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([ideas]));
      }),
    );
    renderSignedIn(<NotesTable />, reader, "/notes");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Archived" }));
    expect(fakeRouter.url).toBe("/notes?status=archived");
    await user.type(screen.getByLabelText("Search title or text"), "ide");
    await waitFor(() => {
      expect(fakeRouter.url).toBe("/notes?search=ide&status=archived");
    });
    await waitFor(() => {
      expect(seen.at(-1)?.get("status")).toBe("archived");
      expect(seen.at(-1)?.get("search")).toBe("ide");
    });
  });

  it("FE-62 creates a draft note with notes:write", async () => {
    serveList([]);
    let sent: unknown;
    server.use(
      http.post("*/api/notes/notes", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ data: { ...groceries } }, { status: 201 });
      }),
    );
    renderSignedIn(<NotesTable />, writer, "/notes");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "New note" }));
    const dialog = screen.getByRole("dialog", { name: "New note" });
    await user.click(
      within(dialog).getByRole("button", { name: "Create note" }),
    );
    expect(await within(dialog).findByText("Enter a title.")).toBeVisible();
    await user.type(within(dialog).getByLabelText(/Title/), " Groceries ");
    await user.type(within(dialog).getByLabelText(/Text/), "Milk, eggs");
    await user.click(
      within(dialog).getByRole("button", { name: "Create note" }),
    );
    expect(await screen.findByText("Note created.")).toBeInTheDocument();
    expect(sent).toEqual({
      title: "Groceries",
      body: "Milk, eggs",
      status: "draft",
    });
  });

  it("archive sends PATCH with If-Match at the version shown", async () => {
    serveList();
    let ifMatch: string | null = null;
    let sent: unknown;
    server.use(
      http.patch("*/api/notes/notes/n1", async ({ request }) => {
        ifMatch = request.headers.get("if-match");
        sent = await request.json();
        return HttpResponse.json({ data: { ...groceries, version: 4 } });
      }),
    );
    renderSignedIn(<NotesTable />, writer, "/notes");
    const user = userEvent.setup();
    await openRowMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    await waitFor(() => {
      expect(ifMatch).toBe('"3"');
    });
    expect(sent).toEqual({ status: "archived" });
  });

  it("a VERSION_CONFLICT on a change says someone else changed the note", async () => {
    serveList();
    server.use(
      http.patch("*/api/notes/notes/n1", () =>
        HttpResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "x",
              meta: { reason: "VERSION_CONFLICT" },
            },
          },
          { status: 409 },
        ),
      ),
    );
    renderSignedIn(<NotesTable />, writer, "/notes");
    const user = userEvent.setup();
    await openRowMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Unpin" }));
    expect(
      await screen.findByText(
        "Someone else changed this note. The list now shows their version.",
      ),
    ).toBeInTheDocument();
  });

  it("delete asks first, then sends DELETE", async () => {
    serveList();
    let deleted = false;
    server.use(
      http.delete("*/api/notes/notes/n1", () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderSignedIn(<NotesTable />, writer, "/notes");
    const user = userEvent.setup();
    await openRowMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", {
      name: "Delete “Groceries”?",
    });
    expect(deleted).toBe(false);
    await user.click(
      within(dialog).getByRole("button", { name: "Delete note" }),
    );
    expect(await screen.findByText("Note deleted.")).toBeInTheDocument();
    expect(deleted).toBe(true);
  });
});
