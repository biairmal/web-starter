import { useTranslations } from "next-intl";
import { SidebarContent } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import type { Tenancy } from "@/lib/authz/can";

// The signed-in frame (DESIGN_BRIEF 5.2, 5.3): the sidebar and top bar on the
// frame tint, and the content on a sheet inset from the window. Under 640px
// the sheet is the screen: no inset, no corners.

export const MAIN_CONTENT_ID = "main-content";

export function AppShell({
  tenancy,
  children,
}: {
  tenancy: Tenancy;
  children: React.ReactNode;
}) {
  const t = useTranslations("shell");
  return (
    <div className="flex min-h-dvh bg-frame">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:ring-2 focus:ring-ring"
      >
        {t("skipToContent")}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-sidebar shrink-0 lg:block">
        <SidebarContent tenancy={tenancy} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar tenancy={tenancy} />
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 bg-background p-4 outline-none sm:me-sheet-inset sm:mb-sheet-inset sm:rounded-xl sm:border sm:p-pad lg:mt-sheet-inset"
        >
          <div className="max-w-screen-xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
