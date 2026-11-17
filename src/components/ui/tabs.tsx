"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Tabs switch between views of one thing. `line` is an underlined row for
// page sections; `pill` is a filled segment for a compact switch. The variant
// is set once on TabsList and its triggers follow it. Arrow keys move between
// tabs (Radix). To keep the tab in the URL, see useUrlTab.

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-stack-md", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  variant = "line",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "line" | "pill";
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(
        "group/tabs-list flex max-w-full items-center overflow-x-auto",
        variant === "line"
          ? "gap-inline-lg shadow-rule-inset"
          : "w-fit gap-0.5 rounded-md bg-muted p-0.5",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-inline-xs text-body font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        // line: an accent underline on the active tab, sitting on the row's rule
        "group-data-[variant=line]/tabs-list:h-button-lg group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:data-[state=active]:border-brand-accent",
        // pill: the active tab is a raised segment
        "group-data-[variant=pill]/tabs-list:h-button-sm group-data-[variant=pill]/tabs-list:rounded-sm group-data-[variant=pill]/tabs-list:px-inset-sm group-data-[variant=pill]/tabs-list:data-[state=active]:bg-background group-data-[variant=pill]/tabs-list:data-[state=active]:ring-1 group-data-[variant=pill]/tabs-list:data-[state=active]:ring-border",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
