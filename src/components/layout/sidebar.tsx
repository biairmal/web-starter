"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/components/auth/session-provider";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { Wordmark } from "@/components/layout/wordmark";
import { type NavGroup, type NavItem, navItems } from "@/config/nav";
import { type Tenancy, isVisible } from "@/lib/authz/can";
import { cn } from "@/lib/utils";

// Sidebar content: wordmark, tenant switcher, navigation, user row
// (DESIGN_BRIEF 5.2). Shown fixed at 1024px and wider, and in the drawer
// below that.

type Section = { group: NavGroup | undefined; items: NavItem[] };

/** Visible entries in config order, grouped; a group with none is left out. */
export function navSections(
  items: readonly NavItem[],
  visible: (item: NavItem) => boolean,
): Section[] {
  const sections: Section[] = [];
  for (const item of items.filter(visible)) {
    const section = sections.find((entry) => entry.group === item.group);
    if (section) {
      section.items.push(item);
    } else {
      sections.push({ group: item.group, items: [item] });
    }
  }
  // Entries without a group come first.
  return sections.sort(
    (a, b) => Number(a.group !== undefined) - Number(b.group !== undefined),
  );
}

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarContent({
  tenancy,
  onNavigate,
}: {
  tenancy: Tenancy;
  /** Called when a link is followed, so the drawer can close. */
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const me = useMe();
  const pathname = usePathname();
  const sections = navSections(navItems, (item) =>
    isVisible(me, item, tenancy),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-topbar shrink-0 items-center px-4">
        <Wordmark />
      </div>
      <TenantSwitcher tenancy={tenancy} />
      <nav aria-label={t("label")} className="flex-1 overflow-y-auto pb-4">
        {sections.map((section) => (
          <div key={section.group ?? "main"}>
            {section.group !== undefined && (
              <h2 className="mt-6 mb-3 px-4 text-small text-faint">
                {t(`groups.${section.group}`)}
              </h2>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href} className="px-2">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "relative flex h-nav-row items-center gap-2.5 rounded-md px-2 text-body transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        active
                          ? "bg-active text-foreground before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:rounded-full before:bg-brand-accent"
                          : "text-muted-foreground hover:bg-raised hover:text-foreground",
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4 shrink-0" />
                      <span className="truncate">
                        {t(`items.${item.labelKey}`)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-rule p-2">
        <UserMenu />
      </div>
    </div>
  );
}
