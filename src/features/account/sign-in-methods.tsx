"use client";

import { useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMe } from "@/components/auth/session-provider";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, isApiError, isReason } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/features/account/use-me-mutations";
import { useUnlinkGoogle } from "@/features/account/use-security";

// The sign-in methods section of the security page (FE-33; APP_FLOW 5.16;
// DESIGN_BRIEF 7.6): password and Google as two rows. Link Google is a plain
// link to the BFF, which sends the browser through Google and back here with
// `?linked=1` or `?error=<reason>`. Unlinking the last way to sign in is
// disabled with the reason inline, before anyone clicks it.

const SECURITY_PATH = "/account/security";
/** The password section of the account page. */
const PASSWORD_FORM_PATH = "/account#password";
const LINK_PATH = "/api/auth/google/link";

/** Toasts the result of a Google link round trip once, then cleans the URL. */
function useLinkResult(linked: boolean, linkError: string | undefined) {
  const t = useTranslations("account.methods");
  const errorText = useErrorText();
  const router = useRouter();
  const queryClient = useQueryClient();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current || (!linked && linkError === undefined)) {
      return;
    }
    shown.current = true;
    if (linked) {
      toast.success(t("linked"));
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    } else if (linkError !== undefined) {
      // Only known reasons get their own copy; anything else is generic.
      toast.error(t("linkFailed"), {
        ...(isReason(linkError)
          ? {
              description: errorText(
                new ApiError({ status: 400, reason: linkError }),
              ).text,
            }
          : {}),
      });
    }
    router.replace(SECURITY_PATH, { scroll: false });
  }, [linked, linkError, queryClient, router, t, errorText]);
}

function MethodRow({
  name,
  status,
  children,
}: {
  name: React.ReactNode;
  status: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex min-h-18 flex-wrap items-center gap-4 border-b border-rule py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-medium">{name}</span>
        <span className="text-small text-muted-foreground">{status}</span>
      </div>
      {children}
    </li>
  );
}

export function SignInMethods({
  googleEnabled,
  linked = false,
  linkError,
}: {
  /** Google sign-in is on in identity (`GET /v1/auth/config`). */
  googleEnabled: boolean;
  /** The page was reached from a successful Google link. */
  linked?: boolean;
  /** The reason a Google link failed, from `?error=`. */
  linkError?: string | undefined;
}) {
  const t = useTranslations("account.methods");
  const me = useMe();
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const unlink = useUnlinkGoogle();
  const [confirming, setConfirming] = useState(false);
  const [lastMethod, setLastMethod] = useState(false);
  useLinkResult(linked, linkError);

  const { password, google } = me.providers;
  // Identity refuses to remove the only way to sign in (LAST_SIGN_IN_METHOD).
  const googleIsLast = google && !password;

  return (
    <section aria-labelledby="security-methods" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="security-methods" className="text-section font-semibold">
          {t("title")}
        </h2>
        <p className="text-body text-muted-foreground">{t("body")}</p>
      </div>
      <ul className="flex flex-col">
        <MethodRow
          name={t("password")}
          status={password ? t("passwordSet") : t("passwordNotSet")}
        >
          <Button asChild variant="link" className="h-auto p-0">
            <Link href={PASSWORD_FORM_PATH}>
              {password ? t("changePassword") : t("setPassword")}
            </Link>
          </Button>
        </MethodRow>
        {(google || googleEnabled) && (
          <MethodRow
            name={t("google")}
            status={google ? t("googleLinked") : t("googleNotLinked")}
          >
            {google ? (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                disabled={googleIsLast}
                aria-describedby={
                  googleIsLast ? "security-google-last" : undefined
                }
                onClick={() => {
                  setConfirming(true);
                }}
              >
                {t("unlink")}
              </Button>
            ) : (
              <Button asChild variant="outline">
                {/* A full navigation: the BFF answers with a redirect. */}
                <a href={LINK_PATH}>{t("link")}</a>
              </Button>
            )}
          </MethodRow>
        )}
      </ul>
      {(googleIsLast || lastMethod) && (
        <p
          id="security-google-last"
          className="flex flex-wrap items-center gap-x-1 rounded-md border border-pill-neutral-ink/15 bg-pill-neutral px-3 py-2 text-body text-pill-neutral-ink"
        >
          <KeyRound aria-hidden="true" className="size-4 shrink-0" />
          {t("lastMethod")}
          <Link href={PASSWORD_FORM_PATH} className="font-medium underline">
            {t("setPasswordFirst")}
          </Link>
        </p>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        destructive
        pending={unlink.isPending}
        title={t("unlinkTitle")}
        description={t("unlinkBody")}
        confirmLabel={t("unlink")}
        onConfirm={() => {
          unlink.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              toast.success(t("unlinked"));
            },
            onError: (error) => {
              setConfirming(false);
              if (isApiError(error) && error.reason === "LAST_SIGN_IN_METHOD") {
                setLastMethod(true);
                return;
              }
              if (isApiError(error) && error.isSessionEnded) {
                return;
              }
              errorToast(errorText(error));
            },
          });
        }}
      />
    </section>
  );
}
