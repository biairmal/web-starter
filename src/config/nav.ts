import type { LucideIcon } from "lucide-react";

// Sidebar entries (TRD 4.3, FE-62). Business modules append here. The shell
// filters entries with `can()` (F2.3); an entry with no permission is shown to
// every signed-in user.
export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: string;
  superAdmin?: boolean;
  multiOnly?: boolean;
};

export const navItems: readonly NavItem[] = [];
