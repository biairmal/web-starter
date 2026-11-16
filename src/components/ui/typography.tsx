import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// The type roles from DESIGN.md as components. Sizes and line heights come
// from the --fs-* and --lh-* tokens, so restyling is a tokens.css edit.

const headingVariants = cva("break-words text-foreground", {
  variants: {
    level: {
      1: "text-title font-semibold",
      2: "text-section font-semibold",
      3: "text-body font-semibold",
    },
  },
  defaultVariants: { level: 2 },
});

type HeadingLevel = NonNullable<VariantProps<typeof headingVariants>["level"]>;

/** `level` sets both the look and the element (h1–h3), keeping the outline honest. */
function Heading({
  level = 2,
  className,
  ...props
}: React.ComponentProps<"h2"> & { level?: HeadingLevel }) {
  const Tag = (["h1", "h2", "h3"] as const)[level - 1] ?? "h2";
  return (
    <Tag
      data-slot="heading"
      className={cn(headingVariants({ level }), className)}
      {...props}
    />
  );
}

const textVariants = cva("", {
  variants: {
    variant: {
      body: "text-body",
      label: "text-body font-medium",
      secondary: "text-meta text-muted-foreground",
      caption: "text-small text-muted-foreground",
      mono: "font-mono text-mono",
      stat: "text-stat tabular-nums",
    },
  },
  defaultVariants: { variant: "body" },
});

function Text({
  variant,
  as: Tag = "p",
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    as?: "p" | "span" | "div" | "code" | "strong";
  }) {
  return (
    <Tag
      data-slot="text"
      className={cn(textVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Heading, Text, headingVariants, textVariants };
