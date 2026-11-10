// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ConflictBanner } from "@/components/feedback/conflict-banner";
import { EmptyState } from "@/components/feedback/empty-state";
import { ForbiddenState } from "@/components/feedback/forbidden-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { renderWithIntl } from "../helpers/intl";

function DialogHarness({
  onConfirm = vi.fn(),
  pending = false,
  confirmText,
}: {
  onConfirm?: () => void;
  pending?: boolean;
  confirmText?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        {"Delete role"}
      </button>
      <p>{open ? "dialog open" : "dialog closed"}</p>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete the role Sales?"
        description="4 users lose its permissions. Their accounts stay."
        confirmLabel="Delete role"
        destructive
        pending={pending}
        onConfirm={onConfirm}
        {...(confirmText === undefined ? {} : { confirmText })}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("traps focus inside the dialog", async () => {
    const user = userEvent.setup();
    renderWithIntl(<DialogHarness />);
    await user.click(screen.getByRole("button", { name: "Delete role" }));
    const dialog = screen.getByRole("dialog", {
      name: "Delete the role Sales?",
    });
    expect(dialog).toHaveAccessibleDescription(
      "4 users lose its permissions. Their accounts stay.",
    );
    for (let step = 0; step < 5; step += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderWithIntl(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Delete role" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(screen.getByText("dialog closed")).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("stays open on Escape while the action runs", async () => {
    const user = userEvent.setup();
    renderWithIntl(<DialogHarness pending />);
    await user.click(screen.getByRole("button", { name: "Delete role" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("confirms with the verb, using the destructive style", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithIntl(<DialogHarness onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "Delete role" }));
    const dialog = screen.getByRole("dialog");
    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.type === "submit",
    );
    expect(confirm).toHaveAttribute("data-variant", "destructive");
    if (!confirm) {
      throw new Error("no confirm button");
    }
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("needs the object's name typed for an irreversible action", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithIntl(<DialogHarness onConfirm={onConfirm} confirmText="Sales" />);
    await user.click(screen.getByRole("button", { name: "Delete role" }));
    const dialog = screen.getByRole("dialog");
    const confirm = Array.from(dialog.querySelectorAll("button")).find(
      (button) => button.type === "submit",
    );
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Type Sales to confirm"), "Sale");
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Type Sales to confirm"), "s");
    expect(confirm).toBeEnabled();
    await user.keyboard("{Enter}");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("ConflictBanner", () => {
  it("FE-45 copies the user's changes and reloads", async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    renderWithIntl(
      <ConflictBanner
        onReload={onReload}
        changes={"+ users:manage\n- audit:read"}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Someone else changed this. Reload to see their version.",
    );
    await user.click(screen.getByRole("button", { name: "Copy my changes" }));
    await expect(navigator.clipboard.readText()).resolves.toBe(
      "+ users:manage\n- audit:read",
    );
    expect(screen.getByText("Copied")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("says so when the clipboard refuses", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(
      new Error("denied"),
    );
    renderWithIntl(<ConflictBanner onReload={vi.fn()} changes="x" />);
    await user.click(screen.getByRole("button", { name: "Copy my changes" }));
    expect(
      await screen.findByText(/Couldn’t copy\. Select and copy/),
    ).toBeInTheDocument();
  });
});

describe("screen states", () => {
  it("shows an empty state with its action", () => {
    renderWithIntl(
      <EmptyState
        title="No roles yet"
        description="Roles group permissions."
        action={<button type="button">{"Create role"}</button>}
      />,
    );
    expect(screen.getByText("No roles yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create role" }),
    ).toBeInTheDocument();
  });

  it("shows the forbidden state with a way home", () => {
    renderWithIntl(<ForbiddenState />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "You don’t have permission to view this",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("announces a loading page", () => {
    renderWithIntl(<PageSkeleton rows={3} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });
});
