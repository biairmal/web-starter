"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useErrorText } from "@/lib/api/use-error-text";
import { cn } from "@/lib/utils";

/**
 * A block that failed to load, shown inside that block so the rest of the
 * screen keeps working (DESIGN_BRIEF 6.6): what failed, why, a retry and the
 * request ID for support.
 */
export function ErrorState({
  title,
  error,
  onRetry,
  retrying = false,
  className,
}: {
  /** What failed, e.g. "Couldn't load users." */
  title: React.ReactNode;
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}) {
  const t = useTranslations("feedback.error");
  const tErrors = useTranslations("errors");
  const describe = useErrorText();
  const { text, requestId } = describe(error);
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-1 py-8 text-body",
        className,
      )}
    >
      <p className="flex items-center gap-2 font-medium">
        <AlertCircle aria-hidden="true" className="size-4 text-negative" />
        {title}
      </p>
      <p className="text-muted-foreground">{text}</p>
      {requestId && (
        <p className="font-mono text-small text-faint">
          {tErrors("requestId", { requestId })}
        </p>
      )}
      {onRetry && (
        <Button
          variant="link"
          className="mt-1 h-auto p-0"
          disabled={retrying}
          onClick={onRetry}
        >
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
