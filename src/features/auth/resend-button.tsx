"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bffPost } from "@/lib/api/bff-fetch";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/features/auth/auth-screen";
import { useCountdown } from "@/features/auth/use-countdown";

// "Resend email" for the verification link (FE-4, DESIGN_BRIEF 7.2): after a
// send, the button waits 60 seconds, showing the time left on its label.
// Identity answers 202 whatever the address, so success never says whether
// an account exists.

export const RESEND_COOLDOWN_SECONDS = 60;

export function ResendButton({
  email,
  coolingDown = false,
  variant = "outline",
  className,
}: {
  email: string;
  /** Start with the cooldown running, because an email was just sent. */
  coolingDown?: boolean;
  variant?: "outline" | "link";
  className?: string;
}) {
  const t = useTranslations("auth.resend");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const wait = useCountdown();
  const [pending, setPending] = useState(false);
  const { start } = wait;

  useEffect(() => {
    if (coolingDown) {
      start(RESEND_COOLDOWN_SECONDS);
    }
  }, [coolingDown, start]);

  if (wait.remaining > 0) {
    return (
      <Button type="button" variant={variant} disabled className={className}>
        {t("wait", { seconds: wait.remaining })}
      </Button>
    );
  }

  const resend = async () => {
    setPending(true);
    try {
      await bffPost("/api/auth/email/resend", { email });
      toast.success(t("sent"));
      wait.start(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      if (isApiError(error) && error.retryAfter !== undefined) {
        wait.start(error.retryAfter);
      }
      errorToast(errorText(error));
    } finally {
      setPending(false);
    }
  };

  // A plain button, not a form: it also sits inside the sign-in form.
  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending || email.length === 0}
      aria-busy={pending || undefined}
      onClick={() => {
        void resend();
      }}
      className={className}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : null}
      {t("action")}
    </Button>
  );
}
