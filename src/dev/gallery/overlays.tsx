"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Text } from "@/components/ui/typography";
import { Demo, Section } from "./section";

export function Overlays() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Kept after closing so the dialog does not change text while it animates out.
  const [confirmKind, setConfirmKind] = useState<"plain" | "destructive">(
    "plain",
  );
  const [showArchived, setShowArchived] = useState(false);
  return (
    <>
      <Section
        id="dialog"
        title="Dialog"
        source="src/components/ui/dialog.tsx, feedback/confirm-dialog.tsx"
      >
        <Demo label="Dialog, confirm, destructive confirm (type the name)">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
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
        title="Sheet (drawer)"
        source="src/components/ui/sheet.tsx"
      >
        <Demo label="Sides">
          {(["right", "left", "bottom"] as const).map((side) => (
            <Sheet key={side}>
              <SheetTrigger asChild>
                <Button variant="outline">{side}</Button>
              </SheetTrigger>
              <SheetContent side={side}>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    A drawer from the {side} edge.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>
          ))}
        </Demo>
      </Section>

      <Section
        id="menu"
        title="Dropdown menu"
        source="src/components/ui/dropdown-menu.tsx"
      >
        <Demo label="Items, checkbox item, sub-menu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Actions</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Note</DropdownMenuLabel>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
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
              <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Demo>
      </Section>

      <Section
        id="popover"
        title="Popover and tooltip"
        source="src/components/ui/popover.tsx, tooltip.tsx"
      >
        <Demo label="Popover, tooltip">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              <Text>Popovers hold small editors, like a filter value.</Text>
            </PopoverContent>
          </Popover>
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
