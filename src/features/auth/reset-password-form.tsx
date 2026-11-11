"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordRules } from "@/components/forms/password-rules";
import { SubmitButton } from "@/components/forms/submit-button";
import { buttonVariants } from "@/components/ui/button";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";
import { bffPost } from "@/lib/api/bff-fetch";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { hardNavigate } from "@/lib/hard-navigate";
import { AuthHeading, InlineNotice } from "@/features/auth/auth-screen";
import { newPasswordSchema } from "@/features/auth/password-schema";
import { useFragmentToken } from "@/features/auth/use-fragment-token";

// /reset-password#token=… (FE-6, APP_FLOW 5.5, DESIGN_BRIEF 7.3): a new
// password with the live rules and a warning that every device is signed out.
// Success goes to sign-in with a confirmation; a used link offers a new one.

export const RESET_DONE_PATH = "/sign-in?reason=PASSWORD_RESET";

type Values = { password: string };

export function ResetPasswordForm() {
  const fragment = useFragmentToken();
  const [expired, setExpired] = useState(false);

  if (fragment.state === "reading") {
    return null;
  }
  if (fragment.state === "missing" || expired) {
    return <ExpiredResetLink />;
  }
  return (
    <NewPasswordForm
      token={fragment.token}
      onExpired={() => {
        setExpired(true);
      }}
    />
  );
}

function NewPasswordForm({
  token,
  onExpired,
}: {
  token: string;
  onExpired: () => void;
}) {
  const t = useTranslations("auth.resetPassword");
  const tPassword = useTranslations("auth.password");
  const errorText = useErrorText();
  const rulesId = useId();
  const [message, setMessage] = useState<string | undefined>();

  const form = useForm<Values>({
    resolver: zodResolver(
      z.object({
        password: newPasswordSchema({
          tooShort: tPassword("tooShort", { min: PASSWORD_MIN_LENGTH }),
          tooLong: tPassword("tooLong", { max: PASSWORD_MAX_LENGTH }),
        }),
      }),
    ),
    mode: "onTouched",
    defaultValues: { password: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      await bffPost("/api/auth/password/reset", {
        token,
        password: values.password,
      });
      hardNavigate(RESET_DONE_PATH);
      await new Promise(() => undefined);
    } catch (error) {
      if (!isApiError(error)) {
        setMessage(errorText(error).text);
        return;
      }
      if (error.reason === "TOKEN_INVALID") {
        onExpired();
        return;
      }
      if (error.reason === "PASSWORD_POLICY" || error.fields.password) {
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
      <AuthHeading title={t("title")} />
      <form
        method="post"
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        className="flex flex-col gap-4"
      >
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
        <InlineNotice tone="warning">{t("warning")}</InlineNotice>
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
          pending={form.formState.isSubmitting}
          className="w-full"
        >
          {t("submit")}
        </SubmitButton>
      </form>
    </div>
  );
}

function ExpiredResetLink() {
  const t = useTranslations("auth.resetPassword");
  return (
    <div className="flex flex-col">
      <AuthHeading title={t("expiredTitle")} body={t("expiredBody")} />
      <Link href="/forgot-password" className={buttonVariants({ size: "lg" })}>
        {t("newLink")}
      </Link>
    </div>
  );
}
