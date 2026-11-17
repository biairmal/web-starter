"use client";

import { type ExternalToast, toast as sonner } from "sonner";
import { ERROR_TOAST } from "@/lib/toast";

// The app's toast presets (DESIGN.md: toasts). Import `toast` from here, never
// from sonner (ESLint enforces it), so the rules hold everywhere:
// - success, info and warning close after 4s (the Toaster default);
// - an error stays until dismissed and has a close button;
// - promise shows "loading", then success or error by the same rules;
// - any of them can carry one action: `{ action: { label, onClick } }`.
// A toast confirms something that already happened. A problem the user must
// fix is shown inline instead.

type Message = Parameters<typeof sonner.success>[0];
type PromiseData<T> = NonNullable<Parameters<typeof sonner.promise<T>>[1]>;

export const toast = {
  success: (message: Message, data?: ExternalToast) =>
    sonner.success(message, data),
  info: (message: Message, data?: ExternalToast) => sonner.info(message, data),
  warning: (message: Message, data?: ExternalToast) =>
    sonner.warning(message, data),
  error: (message: Message, data?: ExternalToast) =>
    sonner.error(message, { ...ERROR_TOAST, ...data }),
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    data: PromiseData<T>,
  ) => sonner.promise(promise, data),
  dismiss: (id?: string | number) => sonner.dismiss(id),
};
