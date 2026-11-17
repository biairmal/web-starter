"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Text } from "@/components/ui/typography";
import { Demo, Section } from "./section";

const PARAGRAPHS = Array.from({ length: 14 }, (_, index) => index + 1);

export function Overlays() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Kept after closing so the dialog does not change text while it animates out.
  const [confirmKind, setConfirmKind] = useState<"plain" | "destructive">(
    "plain",
  );
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState("updated");
  const [wrap, setWrap] = useState(true);
  return (
    <>
      <Section
        id="dialog"
        title="Dialog"
        source="src/components/ui/dialog.tsx, feedback/confirm-dialog.tsx"
      >
        <Demo label="Sizes (--dialog-w-*)">
          {(["sm", "md", "lg"] as const).map((size) => (
            <Dialog key={size}>
              <DialogTrigger asChild>
                <Button variant="outline">{size}</Button>
              </DialogTrigger>
              <DialogContent size={size}>
                <DialogHeader>
                  <DialogTitle>Edit note</DialogTitle>
                  <DialogDescription>
                    Dialogs hold one short task. Longer work gets its own page.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Long content</Button>
            </DialogTrigger>
            <DialogContent size="lg">
              <DialogHeader>
                <DialogTitle>Terms of the workspace</DialogTitle>
                <DialogDescription>
                  The body scrolls; the title and buttons stay put.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="flex flex-col gap-stack-sm">
                {PARAGRAPHS.map((n) => (
                  <Text key={n}>
                    Clause {n}. Members of the workspace keep their own notes
                    and see shared ones. An admin can remove a member, and the
                    notes they wrote stay with the workspace.
                  </Text>
                ))}
              </DialogBody>
              <DialogFooter>
                <Button variant="outline">Decline</Button>
                <Button>Accept</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Demo>
        <Demo label="Confirm, destructive confirm (type the name)">
          <Button
            variant="outline"
            onClick={() => {
              setConfirmKind("plain");
              setConfirmOpen(true);
            }}
          >
            Confirm
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setConfirmKind("destructive");
              setConfirmOpen(true);
            }}
          >
            Delete…
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title={
              confirmKind === "destructive"
                ? "Delete Acme Ltd?"
                : "Resend the invite?"
            }
            description={
              confirmKind === "destructive"
                ? "This removes the tenant and every user in it. It cannot be undone."
                : "We will send a new link and the old one will stop working."
            }
            confirmLabel={
              confirmKind === "destructive" ? "Delete tenant" : "Resend"
            }
            destructive={confirmKind === "destructive"}
            confirmText={confirmKind === "destructive" ? "Acme Ltd" : undefined}
            onConfirm={() => {
              setConfirmOpen(false);
            }}
          />
        </Demo>
      </Section>

      <Section
        id="sheet"
        title="Drawer"
        source="src/components/ui/drawer.tsx, sheet.tsx"
      >
        <Demo label="Sides and sizes (--drawer-w, --drawer-w-lg)">
          {(
            [
              ["right", "md"],
              ["right", "lg"],
              ["left", "md"],
              ["bottom", "md"],
            ] as const
          ).map(([side, size]) => (
            <Drawer key={`${side}-${size}`}>
              <DrawerTrigger asChild>
                <Button variant="outline">
                  {side} {size}
                </Button>
              </DrawerTrigger>
              <DrawerContent side={side} size={size}>
                <DrawerHeader>
                  <DrawerTitle>Note details</DrawerTitle>
                  <DrawerDescription>
                    A drawer from the {side} edge. The body scrolls.
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerBody className="flex flex-col gap-stack-sm">
                  {PARAGRAPHS.map((n) => (
                    <Text key={n}>
                      Activity {n}: Dina edited the title and moved the note to
                      Archive.
                    </Text>
                  ))}
                </DrawerBody>
                <DrawerFooter>
                  <Button>Close</Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ))}
        </Demo>
      </Section>

      <Section
        id="menu"
        title="Dropdown menu"
        source="src/components/ui/dropdown-menu.tsx"
      >
        <Demo label="Items with shortcuts, sub-menu, checkbox and radio items">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Note</DropdownMenuLabel>
              <DropdownMenuItem>
                Edit
                <DropdownMenuShortcut>E</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Duplicate
                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Inbox</DropdownMenuItem>
                  <DropdownMenuItem>Archive</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={showArchived}
                onCheckedChange={setShowArchived}
              >
                Show archived
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                <DropdownMenuRadioItem value="updated">
                  Last updated
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="title">
                  Title
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Demo>
      </Section>

      <Section
        id="menubar"
        title="Menubar"
        source="src/components/ui/menubar.tsx"
      >
        <Demo label="Arrow keys move between menus">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  New note
                  <MenubarShortcut>N</MenubarShortcut>
                </MenubarItem>
                <MenubarSub>
                  <MenubarSubTrigger>Export</MenubarSubTrigger>
                  <MenubarSubContent>
                    <MenubarItem>CSV</MenubarItem>
                    <MenubarItem>PDF</MenubarItem>
                  </MenubarSubContent>
                </MenubarSub>
                <MenubarSeparator />
                <MenubarItem variant="destructive">Delete</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent>
                <MenubarCheckboxItem checked={wrap} onCheckedChange={setWrap}>
                  Wrap long lines
                </MenubarCheckboxItem>
                <MenubarItem disabled>Full screen</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </Demo>
      </Section>

      <Section
        id="popover"
        title="Popover, hover card and tooltip"
        source="src/components/ui/popover.tsx, hover-card.tsx, tooltip.tsx"
      >
        <Demo label="Popover, hover card, tooltip">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <Text>Popovers hold small editors, like a filter value.</Text>
            </PopoverContent>
          </Popover>
          <HoverCard>
            <HoverCardTrigger asChild>
              <a href="#popover" className="text-meta underline">
                Dina Pratama
              </a>
            </HoverCardTrigger>
            <HoverCardContent>
              <Text variant="label">Dina Pratama</Text>
              <Text variant="secondary">Billing admin, joined March 2026.</Text>
            </HoverCardContent>
          </HoverCard>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover or focus me</Button>
              </TooltipTrigger>
              <TooltipContent>
                Tooltips name things; they never hold actions.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Demo>
      </Section>
    </>
  );
}
