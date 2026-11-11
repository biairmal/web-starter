import {
  Building2,
  type LucideIcon,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AUDIT_READ, ROLES_MANAGE, USERS_READ } from "@/lib/authz/permissions";
import type en from "../../messages/en.json";

// Sidebar entries (TRD 4.3, APP_FLOW 2, FE-62). Each screen adds its entry
// when it is built; business modules append here too. The shell shows an
// entry only when `isVisible()` passes: the permission is held, and
// super-admin and multi-mode entries match the user and the config. An entry
// with no permission shows to every signed-in user.

type Messages = typeof en;

export type NavGroup = keyof Messages["nav"]["groups"];
export type NavLabel = keyof Messages["nav"]["items"];

export type NavItem = {
  href: string;
  labelKey: NavLabel;
  icon: LucideIcon;
  /** Entries without a group come first, above the grouped ones. */
  group?: NavGroup;
  permission?: string;
  superAdmin?: boolean;
  multiOnly?: boolean;
};

export const navItems: readonly NavItem[] = [
  {
    href: "/admin/users",
    labelKey: "users",
    icon: Users,
    group: "admin",
    permission: USERS_READ,
  },
  {
    href: "/admin/roles",
    labelKey: "roles",
    icon: ShieldCheck,
    group: "admin",
    permission: ROLES_MANAGE,
  },
  {
    href: "/admin/audit",
    labelKey: "audit",
    icon: ScrollText,
    group: "admin",
    permission: AUDIT_READ,
  },
  {
    href: "/admin/tenants",
    labelKey: "tenants",
    icon: Building2,
    group: "platform",
    superAdmin: true,
    multiOnly: true,
  },
];
