"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";
import { createQueryClient } from "@/lib/api/query-client";

// Loaded after the page is interactive, so toasts add nothing to the first
// load (TRD 12). Sonner keeps toasts raised before it mounts and shows them
// when it subscribes, so a toast on page load is not lost.
const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((module) => module.Toaster),
  { ssr: false },
);

/** Client-side providers for the whole app: server state and toasts. */
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
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
