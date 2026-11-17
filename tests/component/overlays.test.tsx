// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";

describe("Dialog", () => {
  it("takes its width from the size token and scrolls its body", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent size="lg">
          <DialogTitle>Terms</DialogTitle>
          <DialogDescription>Read them.</DialogDescription>
          <DialogBody>Clause 1</DialogBody>
        </DialogContent>
      </Dialog>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    const dialog = screen.getByRole("dialog", { name: "Terms" });
    expect(dialog).toHaveClass("sm:max-w-dialog-lg", "max-h-dialog-h");
    expect(dialog).not.toHaveClass("sm:max-w-dialog-md");
    expect(screen.getByText("Clause 1")).toHaveClass("overflow-y-auto");
  });

  it("closes on Escape and gives focus back to its trigger", async () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>One task.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("Drawer", () => {
  it("a large side drawer replaces the default width", async () => {
    render(
      <Drawer>
        <DrawerTrigger>Details</DrawerTrigger>
        <DrawerContent size="lg">
          <DrawerTitle>Note</DrawerTitle>
          <DrawerDescription>Activity.</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Details" }));
    const drawer = screen.getByRole("dialog", { name: "Note" });
    expect(drawer).toHaveAttribute("data-side", "right");
    expect(drawer).toHaveClass("data-[side=right]:sm:max-w-drawer-lg");
    expect(drawer).not.toHaveClass("data-[side=right]:sm:max-w-drawer");
  });
});

describe("Menubar", () => {
  it("opens a menu and moves to the next one with the arrow keys", async () => {
    render(
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>New note</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>Wrap lines</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>,
    );
    screen.getByRole("menuitem", { name: "File" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(
      await screen.findByRole("menuitem", { name: "New note" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}");
    expect(
      await screen.findByRole("menuitem", { name: "Wrap lines" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Wrap lines" })).toBeNull();
  });
});
