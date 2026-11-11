"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordRules } from "@/components/forms/password-rules";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";
import { bffPost } from "@/lib/api/bff-fetch";
import type { NextResult } from "@/lib/api/bff-types";
import { isApiError } from "@/lib/api/errors";
import { signInUrl } from "@/lib/api/query-client";
import { useErrorText } from "@/lib/api/use-error-text";
import { hardNavigate } from "@/lib/hard-navigate";
import { AuthHeading } from "@/features/auth/auth-screen";
import { newPasswordSchema } from "@/components/forms/password-schema";

// The forced password change (FE-7, APP_FLOW 5.6, DESIGN_BRIEF 7.3): only the
// new password (the restricted token stands in for the current one), the live
// rules, and sign-out as the one way out.

type Values = { password: string };

export function ChangePasswordForm() {
  const t = useTranslations("auth.changePassword");
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
      const result = await bffPost<NextResult>("/api/auth/password/change", {
        new_password: values.password,
      });
      hardNavigate(result.next);
      await new Promise(() => undefined);
    } catch (error) {
      if (isApiError(error) && error.isSessionEnded) {
        // The 10-minute restricted session ran out: sign in again.
        hardNavigate(signInUrl("SESSION_ENDED", "/"));
        return;
      }
      if (
        isApiError(error) &&
        (error.reason === "PASSWORD_POLICY" || error.fields.new_password)
      ) {
        form.setError(
          "password",
          {
            type: "server",
            message:
              error.reason === "PASSWORD_POLICY"
                ? tPassword("policy")
                : (error.fields.new_password ?? tPassword("policy")),
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
      <AuthHeading title={t("title")} body={t("body")} />
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
      <div className="mt-6">
        <SignOutButton className="h-auto p-0 text-muted-foreground">
          {t("signOut")}
        </SignOutButton>
      </div>
    </div>
  );
}
