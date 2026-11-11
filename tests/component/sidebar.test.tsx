// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { Users } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { Can, useCan } from "@/components/auth/can";
import { SessionProvider } from "@/components/auth/session-provider";
import {
  SidebarContent,
  isActivePath,
  navSections,
} from "@/components/layout/sidebar";
import { initials } from "@/components/layout/user-menu";
import type { NavItem } from "@/config/nav";
import { createQueryClient } from "@/lib/api/query-client";
import type { Me } from "@/lib/api/types";
import en from "../../messages/en.json";
import { meFixture } from "../msw/handlers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users/42",
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderWith(me: Me, children: React.ReactNode) {
  const client = createQueryClient({
    navigate: vi.fn(),
    currentPath: () => "/",
  });
  return render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="UTC">
      <QueryClientProvider client={client}>
        <SessionProvider me={me}>{children}</SessionProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const reader: Me = { ...meFixture, permissions: ["users:read"] };

describe("SidebarContent", () => {
  it("shows the Users link under Admin for a user with users:read, marked active on a sub-path", () => {
    renderWith(reader, <SidebarContent tenancy="single" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("heading", { name: "Admin" }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Users" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("FE-50 shows Tenants under Platform only to the super admin in multi mode", () => {
    const superAdmin: Me = { ...meFixture, is_super_admin: true };
    const { unmount } = renderWith(
      superAdmin,
      <SidebarContent tenancy="multi" />,
    );
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(
      within(nav).getByRole("heading", { name: "Platform" }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Tenants" })).toHaveAttribute(
      "href",
      "/admin/tenants",
    );
    expect(
      within(nav).getByRole("link", { name: "Role templates" }),
    ).toHaveAttribute("href", "/admin/role-templates");
    unmount();

    renderWith(superAdmin, <SidebarContent tenancy="single" />);
    expect(screen.queryByRole("link", { name: "Tenants" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Role templates" })).toBeNull();
  });

  it("hides the link and the empty Admin heading without the permission", () => {
    renderWith(meFixture, <SidebarContent tenancy="single" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).queryByRole("link")).toBeNull();
    expect(within(nav).queryByRole("heading")).toBeNull();
  });
});

describe("navSections", () => {
  const items: NavItem[] = [
    {
      href: "/admin/users",
      labelKey: "users",
      icon: Users,
      group: "admin",
      permission: "users:read",
    },
    { href: "/notes", labelKey: "users", icon: Users },
    {
      href: "/admin/tenants",
      labelKey: "users",
      icon: Users,
      group: "platform",
      superAdmin: true,
    },
  ];

  it("puts ungrouped entries first and drops groups with nothing visible", () => {
    const sections = navSections(items, (item) => item.superAdmin !== true);
    expect(sections.map((section) => section.group)).toEqual([
      undefined,
      "admin",
    ]);
    expect(sections[1]?.items.map((item) => item.href)).toEqual([
      "/admin/users",
    ]);
  });
});

describe("helpers", () => {
  it("matches the active path on the entry and its sub-paths only", () => {
    expect(isActivePath("/admin/users", "/admin/users")).toBe(true);
    expect(isActivePath("/admin/users/1", "/admin/users")).toBe(true);
    expect(isActivePath("/admin/usersx", "/admin/users")).toBe(false);
    expect(isActivePath("/account", "/")).toBe(false);
  });

  it("makes up to two initials", () => {
    expect(initials("Dina Pratama")).toBe("DP");
    expect(initials("  ana  maria  lopez ")).toBe("AL");
    expect(initials("Bia")).toBe("B");
    expect(initials("")).toBe("");
  });
});

describe("Can and useCan", () => {
  function Probe() {
    return <p>{useCan("users:manage") ? "may manage" : "may not manage"}</p>;
  }

  it("renders children only with the permission", () => {
    renderWith(
      reader,
      <>
        <Can permission="users:read">
          <p>{"can read"}</p>
        </Can>
        <Can permission="users:manage" fallback={<p>{"read only"}</p>}>
          <p>{"can manage"}</p>
        </Can>
        <Probe />
      </>,
    );
    expect(screen.getByText("can read")).toBeInTheDocument();
    expect(screen.queryByText("can manage")).toBeNull();
    expect(screen.getByText("read only")).toBeInTheDocument();
    expect(screen.getByText("may not manage")).toBeInTheDocument();
  });
});
