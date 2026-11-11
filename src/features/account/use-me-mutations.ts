"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api, unwrap } from "@/lib/api/client";
import { bffPost } from "@/lib/api/bff-fetch";
import type { NextResult } from "@/lib/api/bff-types";
import { queryKeys } from "@/lib/api/query-keys";
import type { Me } from "@/lib/api/types";
import type { ErrorText } from "@/lib/api/use-error-text";

// Changes the signed-in user makes to their own account (FE-32, TRD 8.4).
// Both update the `['me']` query, so the user menu follows without a reload.

/** Where the BFF would send the browser after a voluntary password change. */
const ACCOUNT_PATH = "/account";

export type ProfileValues = { display_name: string };

/** `PATCH /v1/me`: the answer replaces the cached `me`. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProfileValues) =>
      unwrap(api.PATCH("/me", { body: values })),
    onSuccess: (me: Me) => {
      queryClient.setQueryData(queryKeys.me, me);
    },
  });
}

export type PasswordValues = {
  /** Omitted when the account has no password yet (Google only). */
  current_password?: string;
  new_password: string;
};

/**
 * The voluntary password change, through the BFF session route because
 * identity answers with a new session (TRD 7.2). The BFF replaces this
 * browser's cookies; identity has revoked every other session. `me` is
 * refetched, because an account that had no password now has one.
 */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PasswordValues) =>
      bffPost<NextResult>("/api/auth/password/change", {
        ...values,
        next: ACCOUNT_PATH,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

/** A toast for a server failure, with the request ID to quote (DESIGN_BRIEF 6.5). */
export function useErrorToast(): (error: ErrorText) => void {
  const t = useTranslations("errors");
  return (error) => {
    toast.error(error.text, {
      ...(error.requestId
        ? { description: t("requestId", { requestId: error.requestId }) }
        : {}),
    });
  };
}
