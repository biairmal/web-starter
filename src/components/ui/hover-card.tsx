"use client";

import * as React from "react";
import { HoverCard as HoverCardPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// A preview on hover or keyboard focus (a user's card behind their name).
// Never the only way to reach what it shows: touch screens cannot hover.
function HoverCard({
  openDelay = 300,
  closeDelay = 150,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return (
    <HoverCardPrimitive.Root
      data-slot="hover-card"
      openDelay={openDelay}
      closeDelay={closeDelay}
      {...props}
    />
  );
}

function HoverCardTrigger(
  props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>,
) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

function HoverCardContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-(--radix-hover-card-content-transform-origin) rounded-md bg-popover p-inset-md text-popover-foreground shadow-float ring-1 ring-foreground/10 outline-hidden duration-160 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
