import * as React from "react";
import { cva } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// A message inside the page about the page (a failed sync, a plan limit). It
// stays until the cause goes away; for "that worked" after an action, use a
// toast. Tones use the pill-* colour pairs; negative is announced at once
// (role="alert"), the others are a polite status.

const alertVariants = cva(
  "flex flex-wrap items-start gap-x-inline-md gap-y-stack-xs rounded-md border px-4 py-3 text-body",
  {
    variants: {
      tone: {
        info: "border-border bg-raised text-foreground",
        positive:
          "border-pill-positive-ink/15 bg-pill-positive text-pill-positive-ink",
        warning:
          "border-pill-warning-ink/15 bg-pill-warning text-pill-warning-ink",
        negative:
          "border-pill-negative-ink/15 bg-pill-negative text-pill-negative-ink",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

const ICONS = {
  info: Info,
  positive: CircleCheck,
  warning: TriangleAlert,
  negative: CircleAlert,
} as const;

type AlertTone = keyof typeof ICONS;

function Alert({
  tone = "info",
  title,
  action,
  className,
  children,
}: {
  tone?: AlertTone;
  title?: React.ReactNode;
  /** A button or link that fixes the cause, shown at the end. */
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      data-slot="alert"
      data-tone={tone}
      role={tone === "negative" ? "alert" : "status"}
      className={cn(alertVariants({ tone }), className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-stack-xs">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-pretty">{children}</div>}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-inline-sm">{action}</div>
      )}
    </div>
  );
}

export { Alert, alertVariants, type AlertTone };
