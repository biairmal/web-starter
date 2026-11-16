import type { ReactNode } from "react";
import { Heading, Text } from "@/components/ui/typography";

// Layout helpers for the component gallery: a section per component, and a
// labelled demo per state or variant.

export function Section({
  id,
  title,
  source,
  children,
}: {
  id: string;
  title: string;
  /** Where the component lives, so a reader can open it to restyle it. */
  source: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-inset-lg flex-col gap-stack-md border-t border-rule pt-stack-lg first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-stack-xs">
        <Heading level={2} id={`${id}-title`}>
          {title}
        </Heading>
        <Text variant="mono" className="text-muted-foreground">
          {source}
        </Text>
      </div>
      <div className="flex flex-col gap-stack-lg">{children}</div>
    </section>
  );
}

export function Demo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-stack-sm">
      <Text variant="caption">{label}</Text>
      <div className="flex flex-wrap items-center gap-inline-md">
        {children}
      </div>
    </div>
  );
}
