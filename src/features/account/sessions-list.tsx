"use client";

import { MonitorSmartphone } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api/errors";
import type { Session } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { signOut } from "@/lib/sign-out";
import { describeDevice } from "@/features/account/device";
import { useErrorToast } from "@/features/account/use-me-mutations";
import { useRevokeSession, useSessions } from "@/features/account/use-security";

// The sessions section of the security page (FE-22, FE-33; APP_FLOW 5.9;
// DESIGN_BRIEF 7.6): one row per device, the current one first. Another
// device is revoked in place; the current one signs out, which is what
// revoking it would do. "Sign out everywhere" is last, behind a confirmation
// that counts the other sessions.

const NOW_REFRESH_MS = 60_000;

/** The current session first, then the most recently used. */
function ordered(sessions: readonly Session[]): Session[] {
  const lastUsed = (session: Session) =>
    Date.parse(session.last_used_at ?? session.created_at);
  return [...sessions].sort((a, b) =>
    a.current === b.current ? lastUsed(b) - lastUsed(a) : a.current ? -1 : 1,
  );
}

function SessionRow({ session }: { session: Session }) {
  const t = useTranslations("account.sessions");
  const format = useFormatter();
  const now = useNow({ updateInterval: NOW_REFRESH_MS });
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const revoke = useRevokeSession();
  const [signingOut, setSigningOut] = useState(false);
  const { browser, os } = describeDevice(session.user_agent);
  const name =
    browser && os
      ? t("deviceOn", { browser, os })
      : (browser ?? os ?? t("unknownDevice"));
  const lastUsed = new Date(session.last_used_at ?? session.created_at);

  const onRevoke = () => {
    revoke.mutate(session, {
      onSuccess: () => {
        toast.success(t("revoked", { device: name }));
      },
      onError: (error) => {
        // Already gone (signed out on that device): the list refreshes.
        if (
          isApiError(error) &&
          (error.status === 404 || error.isSessionEnded)
        ) {
          return;
        }
        errorToast(errorText(error));
      },
    });
  };

  return (
    <li className="flex min-h-18 items-center gap-4 border-b border-rule py-3 last:border-b-0">
      <MonitorSmartphone
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-medium">{name}</span>
        {session.current ? (
          <span className="w-fit rounded-sm bg-pill-positive px-2 py-0.5 text-small font-medium text-pill-positive-ink">
            {t("current")}
          </span>
        ) : (
          <span className="text-small text-muted-foreground">
            {t("lastUsed", { when: format.relativeTime(lastUsed, now) })}
          </span>
        )}
        {session.ip && (
          <span className="font-mono text-small text-faint">{session.ip}</span>
        )}
      </div>
      {session.current ? (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          disabled={signingOut}
          aria-busy={signingOut || undefined}
          onClick={() => {
            setSigningOut(true);
            void signOut();
          }}
        >
          {t("signOutHere")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          disabled={revoke.isPending}
          aria-busy={revoke.isPending || undefined}
          aria-label={t("revokeLabel", { device: name })}
          onClick={onRevoke}
        >
          {t("revoke")}
        </Button>
      )}
    </li>
  );
}

function SessionsSkeleton() {
  const t = useTranslations("feedback");
  return (
    <div role="status" aria-busy="true" className="flex flex-col">
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="flex min-h-18 items-center gap-4 border-b border-rule py-3 last:border-b-0"
        >
          <SkeletonBar className="size-5" />
          <div className="flex flex-1 flex-col gap-2">
            <SkeletonBar className="w-40" />
            <SkeletonBar className="w-24" />
          </div>
          <SkeletonBar className="w-14" />
        </div>
      ))}
    </div>
  );
}

export function SessionsList() {
  const t = useTranslations("account.sessions");
  const sessions = useSessions();

  return (
    <section
      aria-labelledby="security-sessions"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 id="security-sessions" className="text-section font-semibold">
          {t("title")}
        </h2>
        <p className="text-body text-muted-foreground">{t("body")}</p>
      </div>
      {sessions.isPending ? (
        <SessionsSkeleton />
      ) : sessions.isError ? (
        <ErrorState
          title={t("loadFailed")}
          error={sessions.error}
          retrying={sessions.isFetching}
          onRetry={() => {
            void sessions.refetch();
          }}
        />
      ) : (
        <ul className="flex flex-col">
          {ordered(sessions.data).map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** "Sign out everywhere" (FE-22, APP_FLOW 5.9), confirmed with a count. */
export function SignOutEverywhere() {
  const t = useTranslations("account.everywhere");
  const sessions = useSessions();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const others = sessions.data?.filter((session) => !session.current).length;

  return (
    <section
      aria-labelledby="security-everywhere"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2 id="security-everywhere" className="text-section font-semibold">
          {t("title")}
        </h2>
        <p className="text-body text-muted-foreground">{t("body")}</p>
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          className="text-negative"
          onClick={() => {
            setOpen(true);
          }}
        >
          {t("action")}
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        pending={pending}
        title={t("confirmTitle")}
        description={
          others === undefined
            ? t("confirmBodyUnknown")
            : t("confirmBody", { count: others })
        }
        confirmLabel={t("action")}
        onConfirm={() => {
          setPending(true);
          void signOut({ everywhere: true });
        }}
      />
    </section>
  );
}
