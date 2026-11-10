"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/api/query-client";

/** Client-side providers for the whole app: server state, tooltips, toasts. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() =>
    createQueryClient({
      navigate: (url) => {
        window.location.assign(url);
      },
      currentPath: () => `${window.location.pathname}${window.location.search}`,
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
