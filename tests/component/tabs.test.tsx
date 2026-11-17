// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlTab } from "@/lib/use-url-tab";

const replace = vi.fn();
let search = "";
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users/42",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

function UrlTabs() {
  const [tab, setTab] = useUrlTab("tab", ["details", "activity"] as const);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="pill" aria-label="User">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="details">Profile</TabsContent>
      <TabsContent value="activity">Log</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  beforeEach(() => {
    replace.mockClear();
    search = "";
  });

  it("marks the variant on the list and moves with the arrow keys", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList aria-label="Sections">
          <TabsTrigger value="a">One</TabsTrigger>
          <TabsTrigger value="b">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="a">First</TabsContent>
        <TabsContent value="b">Second</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole("tablist")).toHaveAttribute("data-variant", "line");
    screen.getByRole("tab", { name: "One" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Second");
  });

  it("useUrlTab opens the tab named in the URL and writes the choice back", async () => {
    search = "tab=activity&page=2";
    render(<UrlTabs />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Log");
    await userEvent.click(screen.getByRole("tab", { name: "Details" }));
    expect(replace).toHaveBeenCalledWith("/admin/users/42?page=2", {
      scroll: false,
    });
  });

  it("useUrlTab ignores a value it does not know", () => {
    search = "tab=<script>";
    render(<UrlTabs />);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Profile");
  });
});
