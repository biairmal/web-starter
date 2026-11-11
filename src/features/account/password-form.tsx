"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useMe } from "@/components/auth/session-provider";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordRules } from "@/components/forms/password-rules";
import { newPasswordSchema } from "@/components/forms/password-schema";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import {
  useChangePassword,
  useErrorToast,
} from "@/features/account/use-me-mutations";

// The password section of the account page (FE-32, APP_FLOW 4, DESIGN_BRIEF
// 7.6). It asks for the current password unless the account has none yet
// (signed up with Google). Identity answers with a new session for this
// browser and signs every other device out, which the success toast says.

type Values = { current: string; password: string };

/** The section's id, so "Set a password first" on the security page can link here. */
export const PASSWORD_SECTION_ID = "password";

export function PasswordForm() {
  const t = useTranslations("account.password");
  const tPassword = useTranslations("auth.password");
  const me = useMe();
  const hasPassword = me.providers.password;
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const rulesId = useId();
  const [message, setMessage] = useState<string | undefined>();
  const change = useChangePassword();

  const form = useForm<Values>({
    resolver: zodResolver(
      z.object({
        current: hasPassword
          ? z.string().min(1, { error: t("currentRequired") })
          : z.string(),
        password: newPasswordSchema({
          tooShort: tPassword("tooShort", { min: PASSWORD_MIN_LENGTH }),
          tooLong: tPassword("tooLong", { max: PASSWORD_MAX_LENGTH }),
        }),
      }),
    ),
    mode: "onTouched",
    defaultValues: { current: "", password: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      await change.mutateAsync({
        new_password: values.password,
        ...(hasPassword ? { current_password: values.current } : {}),
      });
      form.reset({ current: "", password: "" });
      toast.success(hasPassword ? t("changed") : t("set"), {
        description: t("otherDevices"),
      });
    } catch (error) {
      if (!isApiError(error) || error.isSessionEnded) {
        // A session end is handled by the query client (TRD 5.6).
        if (!isApiError(error)) {
          errorToast(errorText(error));
        }
        return;
      }
      if (error.reason === "INVALID_CREDENTIALS") {
        form.setError(
          "current",
          { type: "server", message: t("currentWrong") },
          { shouldFocus: true },
        );
        return;
      }
      if (
        error.reason === "PASSWORD_POLICY" ||
        error.fields.new_password !== undefined
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
      const described = errorText(error);
      if (described.treatment === "toast") {
        errorToast(described);
        return;
      }
      setMessage(described.text);
    }
  });

  return (
    <form
      id={PASSWORD_SECTION_ID}
      method="post"
      noValidate
      aria-labelledby="account-password"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex scroll-mt-6 flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="account-password" className="text-section font-semibold">
          {hasPassword ? t("title") : t("setTitle")}
        </h2>
        <p className="text-body text-muted-foreground">
          {hasPassword ? t("body") : t("setBody")}
        </p>
      </div>
      {hasPassword && (
        <FormField
          control={form.control}
          name="current"
          label={t("current")}
          render={(field) => (
            <PasswordInput {...field} autoComplete="current-password" />
          )}
        />
      )}
      <FormField
        control={form.control}
        name="password"
        label={t("new")}
        render={(field) => (
          <PasswordInput
            {...field}
            autoComplete="new-password"
            aria-describedby={
              [field["aria-describedby"], rulesId].filter(Boolean).join(" ") ||
              undefined
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
      <div>
        <SubmitButton pending={form.formState.isSubmitting}>
          {hasPassword ? t("submit") : t("setSubmit")}
        </SubmitButton>
      </div>
    </form>
  );
}
