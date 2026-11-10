import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { brand } from "@/config/brand";
import { errorMessageValues, isReason } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

// The banner on /sign-in for `?reason=` (TRD 5.3, 5.6, 10; DESIGN_BRIEF 6.6):
// why the user is here, for example an ended session or a Google sign-in that
// did not complete. Only known reasons show; anything else in the URL is
// ignored, so the query string cannot put arbitrary text on the page.

export function ReasonBanner({
  reason,
  className,
}: {
  reason: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations("errors.reasons");
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
