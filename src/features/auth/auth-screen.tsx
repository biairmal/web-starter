"use client";

import { AlertTriangle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ErrorText } from "@/lib/api/use-error-text";
import { cn } from "@/lib/utils";

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
  const Icon = tone === "warning" ? AlertTriangle : Info;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-body",
        tone === "warning"
          ? "border-pill-warning-ink/15 bg-pill-warning text-pill-warning-ink"
          : "border-pill-neutral-ink/15 bg-pill-neutral text-pill-neutral-ink",
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-1 flex-col gap-1">
        <span>{children}</span>
        {action}
      </div>
    </div>
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
