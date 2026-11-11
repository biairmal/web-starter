"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordRules } from "@/components/forms/password-rules";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";
import { bffPost } from "@/lib/api/bff-fetch";
import type { NextResult } from "@/lib/api/bff-types";
import { isApiError } from "@/lib/api/errors";
import type { InvitePreview } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { hardNavigate } from "@/lib/hard-navigate";
import { SIGN_OUT_PATH } from "@/lib/sign-out";
import { postSessionMessage } from "@/lib/session-channel";
import { AuthHeading, InlineNotice } from "@/features/auth/auth-screen";
import { newPasswordSchema } from "@/features/auth/password-schema";
import { useFragmentToken } from "@/features/auth/use-fragment-token";

// /invite#token=… (FE-9, APP_FLOW 5.7, DESIGN_BRIEF 7.4): who is inviting the
// user where, a password only when the account has none yet, and a session
// in the invited tenant on accept. A browser signed in as someone else signs
// out first; the token stays in memory, so the page carries on without the
// link being opened again.

/** How long the button shows its check before the page goes (DESIGN_BRIEF 7.4). */
const SUCCESS_PAUSE_MS = 240;

type Loaded =
  | { kind: "loading" }
  | { kind: "expired" }
  | { kind: "error"; text: string }
  | { kind: "ready"; token: string; invite: InvitePreview };

export function AcceptInvite({
  signedInAs,
}: {
  /** The display name of the user this browser is signed in as, if any. */
  signedInAs: string | null;
}) {
  const t = useTranslations("auth.invite");
  const errorText = useErrorText();
  const fragment = useFragmentToken();
  const [state, setState] = useState<Loaded>({ kind: "loading" });
  const [otherUser, setOtherUser] = useState(signedInAs);
  const requested = useRef(false);

  useEffect(() => {
    if (fragment.state === "reading") {
      return;
    }
    if (fragment.state === "missing") {
      setState({ kind: "expired" });
      return;
    }
    if (requested.current) {
      return;
    }
    requested.current = true;
    const { token } = fragment;
    bffPost<InvitePreview>("/api/auth/invite/info", { token }).then(
      (invite) => {
        setState({ kind: "ready", token, invite });
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

  if (state.kind === "loading") {
    return (
      <div role="status" className="flex items-center gap-3">
        <Loader2
          aria-hidden="true"
          className="size-5 animate-spin text-muted-foreground"
        />
        <span className="text-body text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }
  if (state.kind === "expired") {
    return (
      <AuthHeading
        title={t("expiredTitle")}
        body={t("expiredBody", { supportEmail: brand.supportEmail })}
      />
    );
  }
  if (state.kind === "error") {
    return (
      <div className="flex flex-col">
        <AuthHeading title={t("errorTitle")} body={state.text} />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }
  const tenantName = state.invite.tenant.name ?? brand.appName;
  if (otherUser !== null) {
    return (
      <SignedInAsSomeoneElse
        name={otherUser}
        tenantName={tenantName}
        emailMasked={state.invite.email_masked}
        onSignedOut={() => {
          setOtherUser(null);
        }}
      />
    );
  }
  return (
    <InviteForm
      token={state.token}
      invite={state.invite}
      tenantName={tenantName}
      onExpired={() => {
        setState({ kind: "expired" });
      }}
    />
  );
}

/**
 * "You are signed in as X. Sign out to accept this invite for b**@…" The
 * sign-out stays on this page, so the token held in memory is not lost.
 */
function SignedInAsSomeoneElse({
  name,
  tenantName,
  emailMasked,
  onSignedOut,
}: {
  name: string;
  tenantName: string;
  emailMasked: string;
  onSignedOut: () => void;
}) {
  const t = useTranslations("auth.invite");
  const errorText = useErrorText();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const signOut = async () => {
    setPending(true);
    setMessage(undefined);
    try {
      await bffPost(SIGN_OUT_PATH);
      postSessionMessage({ type: "signed-out" });
      onSignedOut();
    } catch (error) {
      setMessage(errorText(error).text);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col">
      <AuthHeading
        title={t("title", { tenant: tenantName })}
        body={
          name.trim()
            ? t("signedInAs", { name, email: emailMasked })
            : t("signedInAsUnnamed", { email: emailMasked })
        }
      />
      <FormErrorSummary invalidCount={0} message={message} />
      <Button
        type="button"
        size="lg"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() => {
          void signOut();
        }}
      >
        {t("signOutToAccept")}
      </Button>
    </div>
  );
}

type Values = { displayName: string; password: string };

function InviteForm({
  token,
  invite,
  tenantName,
  onExpired,
}: {
  token: string;
  invite: InvitePreview;
  tenantName: string;
  onExpired: () => void;
}) {
  const t = useTranslations("auth.invite");
  const tPassword = useTranslations("auth.password");
  const errorText = useErrorText();
  const rulesId = useId();
  const needsPassword = !invite.has_password;
  const [message, setMessage] = useState<string | undefined>();
  const [done, setDone] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(
      z.object({
        displayName: z
          .string()
          .trim()
          .max(100, { error: t("nameTooLong") }),
        password: needsPassword
          ? newPasswordSchema({
              tooShort: tPassword("tooShort", { min: PASSWORD_MIN_LENGTH }),
              tooLong: tPassword("tooLong", { max: PASSWORD_MAX_LENGTH }),
            })
          : z.string(),
      }),
    ),
    mode: "onTouched",
    defaultValues: { displayName: "", password: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    const name = values.displayName.trim();
    try {
      const result = await bffPost<NextResult>("/api/auth/invite/accept", {
        token,
        ...(needsPassword ? { password: values.password } : {}),
        ...(needsPassword && name ? { display_name: name } : {}),
      });
      setDone(true);
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_PAUSE_MS));
      hardNavigate(result.next);
      await new Promise(() => undefined);
    } catch (error) {
      if (isApiError(error) && error.reason === "TOKEN_INVALID") {
        onExpired();
        return;
      }
      if (
        isApiError(error) &&
        (error.reason === "PASSWORD_POLICY" || error.fields.password)
      ) {
        form.setError(
          "password",
          {
            type: "server",
            message:
              error.reason === "PASSWORD_POLICY"
                ? tPassword("policy")
                : (error.fields.password ?? tPassword("policy")),
          },
          { shouldFocus: true },
        );
        return;
      }
      setMessage(errorText(error).text);
    }
  });

  return (
    <div className="flex flex-col">
      <AuthHeading
        title={t("title", { tenant: tenantName })}
        body={t("body", { email: invite.email_masked })}
      />
      <form
        method="post"
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        className="flex flex-col gap-4"
      >
        {needsPassword && (
          <>
            <FormField
              control={form.control}
              name="displayName"
              label={t("name")}
              optional
              render={(field) => <Input {...field} autoComplete="name" />}
            />
            <FormField
              control={form.control}
              name="password"
              label={t("password")}
              render={(field) => (
                <PasswordInput
                  {...field}
                  autoComplete="new-password"
                  aria-describedby={
                    [field["aria-describedby"], rulesId]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                />
              )}
            />
            <PasswordRules id={rulesId} value={password} />
          </>
        )}
        {!needsPassword && <InlineNotice>{t("existingAccount")}</InlineNotice>}
        <FormErrorSummary
          invalidCount={
            form.formState.submitCount > 0
              ? Object.keys(form.formState.errors).length
              : 0
          }
          message={message}
        />
        <SubmitButton
          size="lg"
          pending={form.formState.isSubmitting && !done}
          className="w-full"
        >
          {done ? (
            <span className="flex items-center gap-1.5">
              <Check
                aria-hidden="true"
                className="size-4 animate-in zoom-in-50 duration-240"
              />
              {t("accepted")}
            </span>
          ) : (
            t("accept")
          )}
        </SubmitButton>
      </form>
    </div>
  );
}
