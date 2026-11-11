"use client";

import { useTranslations } from "next-intl";
import type { AdminUser } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// One status mark per user (DESIGN_BRIEF 6.2): a disabled account outranks
// the membership, then the membership in this tenant, then an unverified
// email on an active member.

export type UserStatusKey =
  | "accountDisabled"
  | "invited"
  | "disabled"
  | "removed"
  | "unverified"
  | "active";

type Tone = "positive" | "negative" | "warning" | "neutral";

const TONES: Record<UserStatusKey, Tone> = {
  accountDisabled: "negative",
  invited: "warning",
  disabled: "negative",
  removed: "neutral",
  unverified: "warning",
  active: "positive",
};

const TONE_CLASSES: Record<Tone, string> = {
  positive: "bg-pill-positive text-pill-positive-ink",
  negative: "bg-pill-negative text-pill-negative-ink",
  warning: "bg-pill-warning text-pill-warning-ink",
  neutral: "bg-pill-neutral text-pill-neutral-ink",
};

export function userStatus(
  user: Pick<AdminUser, "status" | "membership_status">,
): UserStatusKey {
  if (user.status === "disabled") {
    return "accountDisabled";
  }
  if (user.membership_status !== "active") {
    return user.membership_status;
  }
  return user.status === "pending" ? "unverified" : "active";
}

export function Pill({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-sm px-2 text-small font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function UserStatusPill({
  user,
}: {
  user: Pick<AdminUser, "status" | "membership_status">;
}) {
  const t = useTranslations("adminUsers.status");
  const key = userStatus(user);
  return <Pill tone={TONES[key]}>{t(key)}</Pill>;
}
