"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * A small panel opened from `trigger`: a popover from 640px up, a bottom sheet
 * below it, with the same content. Escape closes it and focus returns to the
 * trigger (unless `onCloseAutoFocus` prevents that).
 */
export function FilterOverlay({
  open,
  onOpenChange,
  trigger,
  title,
  onCloseAutoFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  /** The panel's accessible name (the sheet's visible heading). */
  title: string;
  onCloseAutoFocus?: (event: Event) => void;
  children: React.ReactNode;
}) {
  const wide = useMediaQuery("(min-width: 640px)");

  if (wide) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          aria-label={title}
          {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
        >
          {children}
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="gap-2 p-4 pb-6"
        {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
      >
        <SheetHeader className="p-0">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
