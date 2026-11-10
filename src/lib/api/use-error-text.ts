import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { brand } from "@/config/brand";
import {
  type ErrorDescription,
  errorMessage,
  errorMessageValues,
  isApiError,
} from "@/lib/api/errors";

export type ErrorText = {
  text: string;
  treatment: ErrorDescription["treatment"] | "unknown";
  requestId: string | undefined;
};

/**
 * Turns any thrown value into the text to show (DESIGN_BRIEF 8.2). An unknown
 * reason on a 4xx shows the server's message; anything that is not an
 * `ApiError` (a network failure) shows the generic message.
 */
export function useErrorText(): (error: unknown) => ErrorText {
  const t = useTranslations("errors");
  return useCallback(
    (error: unknown) => {
      if (!isApiError(error)) {
        return {
          text: t("generic.unexpected"),
          treatment: "toast",
          requestId: undefined,
        };
      }
      const described = errorMessage(error);
      if (described === null) {
        return {
          text: error.message,
          treatment: "unknown",
          requestId: error.requestId,
        };
      }
      return {
        text: t(described.key, errorMessageValues(error, brand)),
        treatment: described.treatment,
        requestId: error.requestId,
      };
    },
    [t],
  );
}
