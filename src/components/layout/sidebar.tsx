"use client";

import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { useMe } from "@/components/auth/session-provider";
import { SIDEBAR_COOKIE } from "@/components/layout/sidebar-cookie";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { Wordmark } from "@/components/layout/wordmark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type NavGroup, type NavItem, navItems } from "@/config/nav";
import { type Tenancy, isVisible } from "@/lib/authz/can";
import { cn } from "@/lib/utils";

// Sidebar content: wordmark, tenant switcher, navigation, user row
// (DESIGN_BRIEF 5.2). Shown fixed at 1024px and wider, where it can collapse
// to an icon rail, and in the drawer below that (always full width).

type Section = { group: NavGroup | undefined; items: NavItem[] };

/**
 * Visible entries in config order, grouped; a group with none is left out.
 * An entry with children keeps only its visible children, and is left out
 * when none are.
 */
export function navSections(
  items: readonly NavItem[],
  visible: (item: NavItem) => boolean,
): Section[] {
  const sections: Section[] = [];
  for (const entry of items) {
    let item: NavItem | undefined = entry;
    if (entry.children) {
      const children = entry.children.filter(visible);
      item = children.length > 0 ? { ...entry, children } : undefined;
    } else if (!visible(entry)) {
      item = undefined;
    }
    if (!item) {
      continue;
    }
    const section = sections.find((s) => s.group === item.group);
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

const rowClasses =
  "group relative flex h-nav-row w-full items-center gap-2.5 rounded-md px-2 text-body transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
const restingClasses =
  "text-muted-foreground hover:bg-raised hover:text-foreground";

function NavIcon({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 transition-colors",
        active ? "text-brand-accent" : "text-faint group-hover:text-foreground",
      )}
    />
  );
}

/** In the rail, a control shows only its icon; the tooltip names it. */
function RailTip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (!collapsed) {
    return children;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate: (() => void) | undefined;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const active = isActivePath(pathname, item.href);
  const label = t(`items.${item.labelKey}`);
  return (
    <RailTip label={label} collapsed={collapsed}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={cn(
          rowClasses,
          collapsed && "justify-center px-0",
          active
            ? "bg-active text-foreground before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:rounded-full before:bg-brand-accent"
            : restingClasses,
        )}
      >
        <NavIcon item={item} active={active} />
        <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
      </Link>
    </RailTip>
  );
}

/** An entry with children: an accordion row, or a side menu in the rail. */
function NavParent({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate: (() => void) | undefined;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const children = item.children ?? [];
  const active = children.some((child) => isActivePath(pathname, child.href));
  const label = t(`items.${item.labelKey}`);
  const tone = active ? "text-foreground" : restingClasses;

  if (collapsed) {
    return (
      <DropdownMenu>
        <RailTip label={label} collapsed>
          <DropdownMenuTrigger
            className={cn(
              rowClasses,
              "justify-center px-0",
              tone,
              active && "bg-active",
            )}
          >
            <NavIcon item={item} active={active} />
            <span className="sr-only">{label}</span>
          </DropdownMenuTrigger>
        </RailTip>
        <DropdownMenuContent side="right" align="start" className="w-48">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          {children.map((child) => (
            <DropdownMenuItem key={child.href} asChild onSelect={onNavigate}>
              <Link
                href={child.href}
                aria-current={
                  isActivePath(pathname, child.href) ? "page" : undefined
                }
              >
                <child.icon aria-hidden="true" />
                {t(`items.${child.labelKey}`)}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <AccordionPrimitive.Item value={item.href}>
      <AccordionPrimitive.Header asChild>
        <div>
          <AccordionPrimitive.Trigger className={cn(rowClasses, tone)}>
            <NavIcon item={item} active={active} />
            <span className="flex-1 truncate text-start">{label}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-faint transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
            />
          </AccordionPrimitive.Trigger>
        </div>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content>
        <ul className="mt-0.5 flex flex-col gap-0.5 ps-4">
          {children.map((child) => (
            <li key={child.href}>
              <NavLink item={child} collapsed={false} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  );
}

/**
 * The navigation list. Groups with children open in place; `type` says
 * whether one (`single`) or several (`multiple`) can be open at once. A group
 * holding the current page starts open. `collapsed` draws the icon rail.
 */
export function SidebarNav({
  sections,
  collapsed = false,
  type = "multiple",
  onNavigate,
  id,
  label,
}: {
  sections: readonly Section[];
  collapsed?: boolean;
  type?: "single" | "multiple";
  onNavigate?: () => void;
  id?: string;
  /** The landmark name; defaults to the app's "Main" navigation. */
  label?: string;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [openAtStart] = useState(() =>
    sections
      .flatMap((section) => section.items)
      .filter((item) =>
        item.children?.some((child) => isActivePath(pathname, child.href)),
      )
      .map((item) => item.href),
  );

  const list = sections.map((section) => (
    <div key={section.group ?? "main"}>
      {section.group !== undefined &&
        (collapsed ? (
          <>
            <h2 className="sr-only">{t(`groups.${section.group}`)}</h2>
            <div aria-hidden="true" className="mx-3 my-3 h-px bg-rule" />
          </>
        ) : (
          <h2 className="mt-6 mb-3 px-4 text-small text-faint">
            {t(`groups.${section.group}`)}
          </h2>
        ))}
      <ul className="flex flex-col gap-0.5">
        {section.items.map((item) => (
          <li key={item.href} className="px-2">
            {item.children ? (
              <NavParent
                item={item}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ) : (
              <NavLink
                item={item}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  ));

  return (
    <nav
      id={id}
      aria-label={label ?? t("label")}
      className="scroll-edges flex-1 overflow-y-auto pb-4"
    >
      <TooltipProvider delayDuration={200}>
        {type === "single" ? (
          <AccordionPrimitive.Root
            type="single"
            collapsible
            defaultValue={openAtStart[0]}
          >
            {list}
          </AccordionPrimitive.Root>
        ) : (
          <AccordionPrimitive.Root type="multiple" defaultValue={openAtStart}>
            {list}
          </AccordionPrimitive.Root>
        )}
      </TooltipProvider>
    </nav>
  );
}

export function SidebarContent({
  tenancy,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: {
  tenancy: Tenancy;
  /** Called when a link is followed, so the drawer can close. */
  onNavigate?: () => void;
  /** Draw the icon rail instead of the full sidebar. */
  collapsed?: boolean;
  /** Shows the collapse button; the drawer leaves it out. */
  onToggleCollapsed?: () => void;
}) {
  const tShell = useTranslations("shell");
  const me = useMe();
  const navId = useId();
  const sections = navSections(navItems, (item) =>
    isVisible(me, item, tenancy),
  );
  const toggleLabel = collapsed
    ? tShell("expandSidebar")
    : tShell("collapseSidebar");

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-topbar shrink-0 items-center",
          collapsed ? "justify-center" : "justify-between ps-4 pe-2",
        )}
      >
        {!collapsed && <Wordmark />}
        {onToggleCollapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={toggleLabel}
            aria-expanded={!collapsed}
            aria-controls={navId}
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" />
            ) : (
              <PanelLeftClose aria-hidden="true" />
            )}
          </Button>
        )}
      </div>
      {!collapsed && <TenantSwitcher tenancy={tenancy} />}
      <SidebarNav
        id={navId}
        sections={sections}
        collapsed={collapsed}
        onNavigate={onNavigate}
      />
      <div className="shrink-0 border-t border-rule p-2">
        <UserMenu compact={collapsed} />
      </div>
    </div>
  );
}

/**
 * The sidebar at 1024px and wider. `defaultCollapsed` comes from the cookie,
 * read on the server, so the first paint already has the right width.
 */
export function DesktopSidebar({
  tenancy,
  defaultCollapsed,
}: {
  tenancy: Tenancy;
  defaultCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 transition-all duration-200 motion-reduce:transition-none lg:block",
        collapsed ? "w-sidebar-rail" : "w-sidebar",
      )}
    >
      <SidebarContent
        tenancy={tenancy}
        collapsed={collapsed}
        onToggleCollapsed={toggle}
      />
    </aside>
  );
}
