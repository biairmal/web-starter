import { CheckCircle2, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { brand } from "@/config/brand";
import { errorMessageValues, isReason } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

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
      <p
        role="status"
        className={cn(
          "flex items-start gap-2 rounded-md border border-pill-positive-ink/15 bg-pill-positive px-3 py-2 text-body text-pill-positive-ink",
          className,
        )}
      >
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {tNotice(reason)}
      </p>
    );
  }
  if (!isReason(reason)) {
    return null;
  }
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border border-pill-neutral-ink/15 bg-pill-neutral px-3 py-2 text-body text-pill-neutral-ink",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {t(reason, errorMessageValues({}, brand))}
    </p>
  );
}
