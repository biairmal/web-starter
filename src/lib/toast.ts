"use client";

import type { ExternalToast, toast as sonnerToast } from "sonner";

// Toasts for screens that must stay light (the public pages, TRD 12): sonner
// is loaded on the first toast, not with the page. The Toaster in providers.tsx
// is loaded the same way and shares sonner's module, so it shows these.

type Message = Parameters<typeof sonnerToast.error>[0];

/** An error toast stays until dismissed (DESIGN.md: toasts). */
export const ERROR_TOAST: ExternalToast = {
  duration: Number.POSITIVE_INFINITY,
  closeButton: true,
};

function show(
  kind: "error" | "success",
  message: Message,
  data?: ExternalToast,
) {
  void import("sonner").then(({ toast }) => {
    toast[kind](message, kind === "error" ? { ...ERROR_TOAST, ...data } : data);
  });
}

export const toast = {
  error: (message: Message, data?: ExternalToast) => {
    show("error", message, data);
  },
  success: (message: Message, data?: ExternalToast) => {
    show("success", message, data);
  },
};
