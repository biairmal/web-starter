// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider } from "@/components/auth/session-provider";
import {
  DesktopSidebar,
  SidebarNav,
  navSections,
} from "@/components/layout/sidebar";
import type { NavItem } from "@/config/nav";
import { createQueryClient } from "@/lib/api/query-client";
import en from "../../messages/en.json";
import { meFixture } from "../msw/handlers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users/42",
  useRouter: () => ({ refresh: vi.fn() }),
}));

const items: NavItem[] = [
  { href: "/notes", labelKey: "notes", icon: Users },
  {
    href: "/people",
    labelKey: "users",
    icon: Users,
    group: "admin",
    children: [
      { href: "/admin/users", labelKey: "users", icon: Users },
      {
        href: "/admin/roles",
        labelKey: "roles",
        icon: ShieldCheck,
        permission: "roles:manage",
      },
    ],
  },
  {
    href: "/platform",
    labelKey: "tenants",
    icon: Building2,
    group: "admin",
    children: [
      { href: "/admin/tenants", labelKey: "tenants", icon: Building2 },
      {
        href: "/admin/role-templates",
        labelKey: "roleTemplates",
        icon: Building2,
        superAdmin: true,
      },
    ],
  },
];

function withIntl(children: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const all = navSections(items, () => true);
const expanded = (name: string) =>
  screen.getByRole("button", { name }).getAttribute("aria-expanded");

describe("navSections with children", () => {
  it("keeps only visible children and drops a group with none", () => {
    const sections = navSections(items, (item) => item.superAdmin !== true);
    const platform = sections[1]?.items[1];
    expect(platform?.children?.map((child) => child.href)).toEqual([
      "/admin/tenants",
    ]);
    const none = navSections(
      items,
      (item) => item.permission === undefined && item.href !== "/admin/users",
    );
    expect(none[1]?.items.map((item) => item.href)).toEqual(["/platform"]);
  });
});

describe("SidebarNav", () => {
  it("opens the group holding the current page; several can be open", async () => {
    render(withIntl(<SidebarNav sections={all} />));
    expect(expanded("Users")).toBe("true");
    expect(expanded("Tenants")).toBe("false");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await userEvent.click(screen.getByRole("button", { name: "Tenants" }));
    expect(expanded("Users")).toBe("true");
    expect(expanded("Tenants")).toBe("true");
  });

  it("with type single, opening a group closes the other", async () => {
    render(withIntl(<SidebarNav sections={all} type="single" />));
    await userEvent.click(screen.getByRole("button", { name: "Tenants" }));
    expect(expanded("Tenants")).toBe("true");
    expect(expanded("Users")).toBe("false");
  });

  it("moves between group buttons with the arrow keys", async () => {
    render(withIntl(<SidebarNav sections={all} />));
    screen.getByRole("button", { name: "Users" }).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("button", { name: "Tenants" })).toHaveFocus();
  });

  it("as a rail keeps every name for screen readers and opens a group as a menu", async () => {
    render(withIntl(<SidebarNav sections={all} collapsed />));
    expect(screen.getByRole("link", { name: "Notes" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Admin" }),
    ).toHaveClass("sr-only");
    await userEvent.click(screen.getByRole("button", { name: "Tenants" }));
    expect(
      await screen.findByRole("menuitem", { name: "Role templates" }),
    ).toBeInTheDocument();
  });
});

describe("DesktopSidebar", () => {
  afterEach(() => {
    document.cookie = "sidebar_state=; path=/; max-age=0";
  });

  it("collapses to the rail and remembers it in a cookie", async () => {
    const client = createQueryClient({
      navigate: vi.fn(),
      currentPath: () => "/",
    });
    render(
      withIntl(
        <QueryClientProvider client={client}>
          <SessionProvider me={meFixture}>
            <DesktopSidebar tenancy="single" defaultCollapsed={false} />
          </SessionProvider>
        </QueryClientProvider>,
      ),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    );
    expect(document.cookie).toContain("sidebar_state=collapsed");
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("complementary")).toHaveClass("w-sidebar-rail");
  });
});
