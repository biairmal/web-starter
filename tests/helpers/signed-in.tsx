import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { Toaster } from "sonner";
import { vi } from "vitest";
import { SessionProvider } from "@/components/auth/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/api/query-client";
import type { Me } from "@/lib/api/types";
import { meFixture } from "../msw/handlers";
import { IntlWrapper } from "./intl";

/**
 * Renders `ui` as a signed-in screen: the app's query client, the session
 * with `me`, English messages, tooltips and the toaster. Returns the query client and
 * the navigation spy the client calls on a session end.
 */
export function renderSignedIn(
  ui: React.ReactElement,
  me: Me = meFixture,
  path = "/account",
) {
  const navigate = vi.fn();
  const client = createQueryClient({ navigate, currentPath: () => path });
  const view = render(
    <QueryClientProvider client={client}>
      <IntlWrapper>
        <SessionProvider me={me}>
          <TooltipProvider>{ui}</TooltipProvider>
          <Toaster />
        </SessionProvider>
      </IntlWrapper>
    </QueryClientProvider>,
  );
  return { ...view, client, navigate };
}
