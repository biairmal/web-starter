// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";

describe("PageHeader", () => {
  it("renders exactly one level-1 heading with the title", () => {
    render(<PageHeader title="Users" />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Users" }),
    ).toBeInTheDocument();
  });

  it("shows the description after the title, and omits it when not given", () => {
    const { rerender } = render(
      <PageHeader title="Users" description="Everyone with access." />,
    );
    expect(screen.getByText("Everyone with access.").tagName).toBe("P");
    rerender(<PageHeader title="Users" />);
    expect(screen.queryByText("Everyone with access.")).not.toBeInTheDocument();
  });

  it("puts the action in the same row as the text", () => {
    render(
      <PageHeader
        title="Users"
        action={<button type="button">{"Invite user"}</button>}
      />,
    );
    const action = screen.getByRole("button", { name: "Invite user" });
    const heading = screen.getByRole("heading", { level: 1 });
    expect(action.parentElement?.parentElement).toBe(
      heading.closest("div")?.parentElement,
    );
  });

  it("puts a breadcrumb above the title and a status before the actions", () => {
    render(
      <PageHeader
        title="Editor"
        breadcrumb={
          <Breadcrumb
            label="Breadcrumb"
            items={[
              { label: "Roles", href: "/admin/roles" },
              { label: "Editor" },
            ]}
          />
        }
        status={<p>{"Unsaved changes"}</p>}
        action={<button type="button">{"Save"}</button>}
      />,
    );
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(trail).getByRole("link", { name: "Roles" })).toHaveAttribute(
      "href",
      "/admin/roles",
    );
    expect(within(trail).getByText("Editor")).toHaveAttribute(
      "aria-current",
      "page",
    );
    const status = screen.getByText("Unsaved changes");
    const save = screen.getByRole("button", { name: "Save" });
    expect(status.compareDocumentPosition(save)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("sticks to the top only when asked, and only from 640px up", () => {
    const { container, rerender } = render(<PageHeader title="Users" />);
    const header = () =>
      container.querySelector('[data-slot="page-header"]')?.className ?? "";
    expect(header()).not.toContain("sticky");
    rerender(<PageHeader title="Users" sticky />);
    expect(header()).toContain("sm:sticky");
    expect(header()).not.toMatch(/(^|\s)sticky/);
  });

  it("lets a very long unbroken title wrap instead of widening the page", () => {
    render(
      <PageHeader
        title={"x".repeat(120)}
        action={<button type="button">{"Go"}</button>}
      />,
    );
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.className).toContain("break-words");
    expect(heading.parentElement?.className).toContain("min-w-0");
  });

  it("sets no cursor of its own", () => {
    const { container } = render(<PageHeader title="Users" />);
    expect(container.innerHTML).not.toContain("cursor-");
  });
});
