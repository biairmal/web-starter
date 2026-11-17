import { cookies } from "next/headers";
import { SessionProvider } from "@/components/auth/session-provider";
import { AppShell } from "@/components/layout/app-shell";
import {
  SIDEBAR_COOKIE,
  isSidebarCollapsed,
} from "@/components/layout/sidebar-cookie";
import { requireMe } from "@/lib/session/require-permission";
import { getAuthConfig } from "@/lib/session/me";

// The signed-in shell. `GET /v1/me` is loaded once per request and handed to
// client components through SessionProvider (TRD 6.2).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [me, config, cookieStore] = await Promise.all([
    requireMe(),
    getAuthConfig(),
    cookies(),
  ]);
  return (
    <SessionProvider me={me}>
      <AppShell
        tenancy={config?.tenancy ?? "single"}
        sidebarCollapsed={isSidebarCollapsed(
          cookieStore.get(SIDEBAR_COOKIE)?.value,
        )}
      >
        {children}
      </AppShell>
    </SessionProvider>
  );
}
