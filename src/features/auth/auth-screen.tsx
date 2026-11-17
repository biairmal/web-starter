"use client";

import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ErrorText } from "@/lib/api/use-error-text";

// Pieces every public auth screen shares (DESIGN_BRIEF 5.1, 6.5).

/** The screen's one `h1` and the sentence under it. */
export function AuthHeading({
  title,
  body,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      <h1 className="text-title font-semibold">{title}</h1>
      {body && <p className="text-body text-muted-foreground">{body}</p>}
    </div>
  );
}

/**
 * An inline notice about the form in front of the user, with an optional
 * action (EMAIL_NOT_VERIFIED, the reset warning).
 */
export function InlineNotice({
  tone = "neutral",
  children,
  action,
  className,
}: {
  tone?: "neutral" | "warning";
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Alert tone={tone === "warning" ? "warning" : "info"} className={className}>
      <span className="flex flex-col gap-stack-xs">
        {children}
        {action}
      </span>
    </Alert>
  );
}

/**
 * The user cannot go on (ACCOUNT_DISABLED, TENANT_SUSPENDED): the message with
 * the support email, and a way back to the form.
 */
export function FullPageNotice({
  title,
  message,
  onBack,
}: {
  title: React.ReactNode;
  message: React.ReactNode;
  onBack: () => void;
}) {
  const t = useTranslations("auth.common");
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-title font-semibold">{title}</h1>
      <p role="alert" className="text-body text-muted-foreground">
        {message}
      </p>
      <div className="mt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
      </div>
    </div>
  );
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
