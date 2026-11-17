"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { AdminUser } from "@/lib/api/types";

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

const TONES = {
  accountDisabled: "negative",
  invited: "warning",
  disabled: "negative",
  removed: "neutral",
  unverified: "warning",
  active: "positive",
} as const satisfies Record<UserStatusKey, string>;

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

export function UserStatusPill({
  user,
}: {
  user: Pick<AdminUser, "status" | "membership_status">;
}) {
  const t = useTranslations("adminUsers.status");
  const key = userStatus(user);
  return <Badge variant={TONES[key]}>{t(key)}</Badge>;
}
