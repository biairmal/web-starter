import { useTranslations } from "next-intl";
import { brand } from "@/config/brand";
import { errorMessageValues, isReason } from "@/lib/api/errors";
import { Alert } from "@/components/ui/alert";

// The banner on /sign-in for `?reason=` (TRD 5.3, 5.6, 10; DESIGN_BRIEF 6.6):
// why the user is here, for example an ended session or a Google sign-in that
// did not complete. Only known reasons show; anything else in the URL is
// ignored, so the query string cannot put arbitrary text on the page.

/** Outcomes, not errors, that also send the user to sign-in (APP_FLOW 5.5). */
export const SIGN_IN_NOTICES = ["PASSWORD_RESET"] as const;
export type SignInNotice = (typeof SIGN_IN_NOTICES)[number];

function isNotice(value: unknown): value is SignInNotice {
  return SIGN_IN_NOTICES.some((notice) => notice === value);
}

export function ReasonBanner({
  reason,
  className,
}: {
  reason: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations("errors.reasons");
  const tNotice = useTranslations("auth.notices");
  if (isNotice(reason)) {
    return (
      <Alert tone="positive" className={className}>
        {tNotice(reason)}
      </Alert>
    );
  }
  if (!isReason(reason)) {
    return null;
  }
  return (
    <Alert tone="info" className={className}>
      {t(reason, errorMessageValues({}, brand))}
    </Alert>
  );
}
