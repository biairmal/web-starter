import { SessionProvider } from "@/components/auth/session-provider";
import { AppShell } from "@/components/layout/app-shell";
import { requireMe } from "@/lib/session/require-permission";
import { getAuthConfig } from "@/lib/session/me";

// The signed-in shell. `GET /v1/me` is loaded once per request and handed to
// client components through SessionProvider (TRD 6.2).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [me, config] = await Promise.all([requireMe(), getAuthConfig()]);
  return (
    <SessionProvider me={me}>
      <AppShell tenancy={config?.tenancy ?? "single"}>{children}</AppShell>
    </SessionProvider>
  );
}
