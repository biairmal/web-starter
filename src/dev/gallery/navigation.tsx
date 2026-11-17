"use client";

import {
  Building2,
  LayoutTemplate,
  NotebookPen,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Suspense, useState } from "react";
import { SidebarNav, navSections } from "@/components/layout/sidebar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Text } from "@/components/ui/typography";
import type { NavItem } from "@/config/nav";
import { useUrlTab } from "@/lib/use-url-tab";
import { Demo, Section } from "./section";

// Fake entries: "/dev/components" is the current page, so the Users child
// shows as active and its group starts open.
const DEMO_NAV: NavItem[] = [
  { href: "#sidebar-notes", labelKey: "notes", icon: NotebookPen },
  {
    href: "#sidebar-people",
    labelKey: "users",
    icon: Users,
    group: "admin",
    children: [
      { href: "/dev/components", labelKey: "users", icon: Users },
      { href: "#sidebar-roles", labelKey: "roles", icon: ShieldCheck },
    ],
  },
  {
    href: "#sidebar-audit",
    labelKey: "audit",
    icon: ScrollText,
    group: "admin",
  },
  {
    href: "#sidebar-platform",
    labelKey: "tenants",
    icon: Building2,
    group: "platform",
    children: [
      { href: "#sidebar-tenants", labelKey: "tenants", icon: Building2 },
      {
        href: "#sidebar-templates",
        labelKey: "roleTemplates",
        icon: LayoutTemplate,
      },
    ],
  },
];
const SECTIONS = navSections(DEMO_NAV, () => true);

function UrlTabsDemo() {
  const [tab, setTab] = useUrlTab("tab", ["details", "activity"] as const);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="pill" aria-label="User, in the URL">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="details">
        <Text variant="secondary">
          The open tab is in the address bar (?tab=activity). Reload keeps it.
        </Text>
      </TabsContent>
      <TabsContent value="activity">
        <Text variant="secondary">Dina signed in from a new device.</Text>
      </TabsContent>
    </Tabs>
  );
}

export function Navigation() {
  const [collapsed, setCollapsed] = useState(false);
  const [type, setType] = useState<"single" | "multiple">("multiple");
  return (
    <>
      <Section id="tabs" title="Tabs" source="src/components/ui/tabs.tsx">
        <Demo label="Line (page sections)">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList aria-label="Account">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="billing" disabled>
                Billing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <Text variant="secondary">Name, email and language.</Text>
            </TabsContent>
            <TabsContent value="security">
              <Text variant="secondary">Password and sign-in methods.</Text>
            </TabsContent>
            <TabsContent value="sessions">
              <Text variant="secondary">
                Devices signed in to this account.
              </Text>
            </TabsContent>
          </Tabs>
        </Demo>
        <Demo label="Pill, synced to the URL (useUrlTab)">
          <Suspense>
            <UrlTabsDemo />
          </Suspense>
        </Demo>
      </Section>

      <Section
        id="sidebar"
        title="Sidebar"
        source="src/components/layout/sidebar.tsx, src/config/nav.ts"
      >
        <Demo label="Options">
          <div className="flex items-center gap-inline-sm">
            <Switch
              id="g-rail"
              checked={collapsed}
              onCheckedChange={setCollapsed}
            />
            <Label htmlFor="g-rail">Icon rail</Label>
          </div>
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(value) => {
              if (value === "single" || value === "multiple") {
                setType(value);
              }
            }}
            aria-label="Open groups"
          >
            <ToggleGroupItem value="multiple">Many open</ToggleGroupItem>
            <ToggleGroupItem value="single">One open</ToggleGroupItem>
          </ToggleGroup>
        </Demo>
        <div
          data-collapsed={collapsed || undefined}
          className={
            collapsed
              ? "flex h-96 w-sidebar-rail flex-col rounded-lg border bg-frame"
              : "flex h-96 w-sidebar flex-col rounded-lg border bg-frame"
          }
        >
          <SidebarNav
            key={`${type}-${String(collapsed)}`}
            sections={SECTIONS}
            collapsed={collapsed}
            type={type}
            label="Sidebar demo"
          />
        </div>
        <Text variant="caption">
          In the app the collapse button sits at the top of the sidebar and the
          choice is kept in a cookie, so a reload paints the right width.
        </Text>
      </Section>
    </>
  );
}
