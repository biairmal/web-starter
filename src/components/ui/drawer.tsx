"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// A panel that slides in from an edge, for a detail or a form beside the page.
// It is the Sheet with a size: side panels take --drawer-w or --drawer-w-lg,
// a bottom drawer never grows past --dialog-max-h. Long content goes in
// DrawerBody, which scrolls between header and footer.
const DRAWER_SIZES = {
  md: "",
  lg: "data-[side=left]:sm:max-w-drawer-lg data-[side=right]:sm:max-w-drawer-lg",
} as const;

function DrawerContent({
  side = "right",
  size = "md",
  className,
  ...props
}: Omit<React.ComponentProps<typeof SheetContent>, "side"> & {
  side?: "left" | "right" | "bottom";
  size?: keyof typeof DRAWER_SIZES;
}) {
  return (
    <SheetContent
      side={side}
      className={cn(
        "gap-0 data-[side=bottom]:max-h-dialog-h",
        DRAWER_SIZES[size],
        className,
      )}
      {...props}
    />
  );
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        "scroll-edges min-h-0 flex-1 overflow-y-auto p-4",
        className,
      )}
      {...props}
    />
  );
}

export {
  Sheet as Drawer,
  SheetTrigger as DrawerTrigger,
  SheetClose as DrawerClose,
  DrawerContent,
  SheetHeader as DrawerHeader,
  DrawerBody,
  SheetFooter as DrawerFooter,
  SheetTitle as DrawerTitle,
  SheetDescription as DrawerDescription,
};
