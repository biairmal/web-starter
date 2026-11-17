"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/initials";

// A person's picture, or their initials while it loads or when there is
// none. The whole avatar is one image named by `name`; pass `decorative` when
// the name is already written next to it, so it is not read twice. Sizes come
// from --avatar-sm, --avatar-md and --avatar-lg.

const SIZES = {
  sm: "size-avatar-sm text-small",
  md: "size-avatar-md text-small",
  lg: "size-avatar-lg text-body",
  xl: "size-avatar-xl text-section",
} as const;

function Avatar({
  name,
  src,
  size = "md",
  decorative = false,
  className,
}: {
  name: string;
  src?: string | undefined;
  size?: keyof typeof SIZES;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-active font-medium select-none",
        SIZES[size],
        className,
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt=""
          className="size-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        aria-hidden="true"
        className="flex size-full items-center justify-center"
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

/**
 * Overlapping avatars, showing at most `max` and then "+N". `label` names the
 * group for screen readers, e.g. "5 people with access".
 */
function AvatarGroup({
  people,
  max = 4,
  size = "md",
  label,
  className,
}: {
  people: readonly { name: string; src?: string }[];
  max?: number;
  size?: keyof typeof SIZES;
  label: string;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="avatar-group"
      className={cn(
        "flex items-center -space-x-2 rtl:space-x-reverse",
        className,
      )}
    >
      {shown.map((person) => (
        <Avatar
          key={person.name}
          name={person.name}
          src={person.src}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground tabular-nums ring-2 ring-background",
            SIZES[size],
          )}
        >
          {`+${String(rest)}`}
        </span>
      )}
    </div>
  );
}

export { Avatar, AvatarGroup };
