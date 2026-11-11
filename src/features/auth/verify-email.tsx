"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bffPost } from "@/lib/api/bff-fetch";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { AuthHeading } from "@/features/auth/auth-screen";
import { ResendButton } from "@/features/auth/resend-button";
import { useFragmentToken } from "@/features/auth/use-fragment-token";

// /verify-email#token=… (FE-5, APP_FLOW 5.4, DESIGN_BRIEF 7.2): working, done
// or failed, in the same composition. An expired or used link offers a new
// one for the address the user types.

type State =
  | { kind: "working" }
  | { kind: "done" }
  | { kind: "expired" }
  | { kind: "error"; text: string };

export function VerifyEmail() {
  const t = useTranslations("auth.verifyEmail");
  const errorText = useErrorText();
  const fragment = useFragmentToken();
  const [state, setState] = useState<State>({ kind: "working" });
  const sent = useRef(false);

  useEffect(() => {
    if (fragment.state === "reading") {
      return;
    }
    if (fragment.state === "missing") {
      setState({ kind: "expired" });
      return;
    }
    // The token works once: never post it twice, even when an effect re-runs.
    if (sent.current) {
      return;
    }
    sent.current = true;
    bffPost("/api/auth/email/verify", { token: fragment.token }).then(
      () => {
        setState({ kind: "done" });
      },
      (error: unknown) => {
        setState(
          isApiError(error) && error.reason === "TOKEN_INVALID"
            ? { kind: "expired" }
            : { kind: "error", text: errorText(error).text },
        );
      },
    );
  }, [fragment, errorText]);

  if (state.kind === "working") {
    return (
      <div role="status" className="flex items-center gap-3">
        <Loader2
          aria-hidden="true"
          className="size-5 animate-spin text-muted-foreground"
        />
        <h1 className="text-title font-semibold">{t("working")}</h1>
      </div>
    );
  }

  if (state.kind === "done") {
    return (
      <div className="flex flex-col">
        <AuthHeading title={t("doneTitle")} body={t("doneBody")} />
        <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
          {t("signIn")}
        </Link>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col">
        <AuthHeading title={t("errorTitle")} body={state.text} />
        <Link
          href="/sign-in"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          {t("signIn")}
        </Link>
      </div>
    );
  }

  return <ExpiredLink />;
}

/** "This link has expired or was already used" and a way to get a new one. */
function ExpiredLink() {
  const t = useTranslations("auth.verifyEmail");
  const id = useId();
  const [email, setEmail] = useState("");
  return (
    <div className="flex flex-col">
      <AuthHeading title={t("expiredTitle")} body={t("expiredBody")} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={id}>{t("email")}</Label>
          <Input
            id={id}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => {
              setEmail(event.target.value.trim());
            }}
          />
        </div>
        <ResendButton email={email} variant="outline" className="w-full" />
      </div>
      <p className="mt-6 text-body">
        <Link
          href="/sign-in"
          className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
