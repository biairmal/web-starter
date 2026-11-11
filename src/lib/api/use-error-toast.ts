"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";
import { type ErrorText, useErrorText } from "@/lib/api/use-error-text";

/**
 * A toast for a failed request, with the request ID to quote for support
 * (DESIGN_BRIEF 6.5). Takes the thrown value or its `ErrorText`.
 */
export function useErrorToast(): (error: unknown) => void {
  const t = useTranslations("errors");
  const errorText = useErrorText();
  return useCallback(
    (error: unknown) => {
      const described = isErrorText(error) ? error : errorText(error);
      toast.error(described.text, {
        ...(described.requestId
          ? { description: t("requestId", { requestId: described.requestId }) }
          : {}),
      });
    },
    [errorText, t],
  );
}

function isErrorText(value: unknown): value is ErrorText {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    "treatment" in value
  );
}
