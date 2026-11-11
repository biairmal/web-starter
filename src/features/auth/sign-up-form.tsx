"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { PasswordRules } from "@/components/forms/password-rules";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";
import { applyServerErrors } from "@/lib/api/apply-server-errors";
import { bffPost } from "@/lib/api/bff-fetch";
import { isApiError } from "@/lib/api/errors";
import type { AuthConfig } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { hardNavigate } from "@/lib/hard-navigate";
import { AuthHeading, useErrorToast } from "@/features/auth/auth-screen";
import { rememberSignUpEmail } from "@/features/auth/check-email-store";
import { newPasswordSchema } from "@/features/auth/password-schema";
import { useAuthConfig } from "@/features/auth/use-auth-config";

// Sign-up (FE-4, APP_FLOW 5.4, DESIGN_BRIEF 7.2). Identity answers 202 for a
// new and an existing address alike, so both go to "Check your email".

export const CHECK_EMAIL_PATH = "/sign-up/check-email";

type Values = {
  displayName: string;
  email: string;
  password: string;
  tenant: string;
};

const FIELDS = ["displayName", "email", "password", "tenant"] as const;

/** Legal links are shown only when brand.ts has a URL for them. */
const legal: { termsUrl: string; privacyUrl: string } = brand.legal;

export function SignUpForm({ initialConfig }: { initialConfig: AuthConfig }) {
  const t = useTranslations("auth.signUp");
  const tPassword = useTranslations("auth.password");
  const router = useRouter();
  const config = useAuthConfig(initialConfig);
  const multi = config.tenancy === "multi";
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const rulesId = useId();
  const [message, setMessage] = useState<string | undefined>();

  const schema = z.object({
    displayName: z
      .string()
      .trim()
      .min(1, { error: t("nameRequired") })
      .max(100, { error: t("nameTooLong") }),
    email: z
      .string()
      .trim()
      .pipe(z.email({ error: t("emailInvalid") })),
    password: newPasswordSchema({
      tooShort: tPassword("tooShort", { min: PASSWORD_MIN_LENGTH }),
      tooLong: tPassword("tooLong", { max: PASSWORD_MAX_LENGTH }),
    }),
    tenant: multi
      ? z
          .string()
          .trim()
          .min(1, { error: t("tenantRequired") })
      : z.string(),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { displayName: "", email: "", password: "", tenant: "" },
  });
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      await bffPost("/api/auth/register", {
        display_name: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
        ...(multi ? { tenant: values.tenant.trim() } : {}),
      });
      rememberSignUpEmail(values.email.trim());
      router.push(CHECK_EMAIL_PATH);
    } catch (error) {
      handleError(error);
    }
  });

  function handleError(error: unknown) {
    if (isApiError(error) && error.reason === "REGISTRATION_CLOSED") {
      hardNavigate("/sign-in?reason=REGISTRATION_CLOSED");
      return;
    }
    if (isApiError(error) && error.reason === "PASSWORD_POLICY") {
      form.setError(
        "password",
        { type: "server", message: tPassword("policy") },
        { shouldFocus: true },
      );
      return;
    }
    if (isApiError(error) && Object.keys(error.fields).length > 0) {
      const { applied } = applyServerErrors(form, FIELDS, error, {
        fieldMap: { display_name: "displayName" },
      });
      if (applied.length > 0) {
        return;
      }
    }
    const described = errorText(error);
    if (described.treatment === "toast") {
      errorToast(described);
      return;
    }
    setMessage(described.text);
  }

  const errorCount =
    form.formState.submitCount > 0
      ? Object.keys(form.formState.errors).length
      : 0;

  return (
    <div className="flex flex-col">
      <AuthHeading title={t("title", { appName: brand.appName })} />
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
          name="displayName"
          label={t("name")}
          render={(field) => <Input {...field} autoComplete="name" />}
        />
        <FormField
          control={form.control}
          name="email"
          label={t("email")}
          render={(field) => (
            <Input
              {...field}
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
            />
          )}
        />
        {multi && (
          <FormField
            control={form.control}
            name="tenant"
            label={t("tenant")}
            description={t("tenantHelp")}
            render={(field) => (
              <Input
                {...field}
                autoComplete="organization"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          />
        )}
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

        <FormErrorSummary invalidCount={errorCount} message={message} />
        <SubmitButton
          size="lg"
          pending={form.formState.isSubmitting}
          className="w-full"
        >
          {t("submit")}
        </SubmitButton>
        {(legal.termsUrl || legal.privacyUrl) && (
          <p className="text-small text-faint">{t("legal")}</p>
        )}
      </form>
      <p className="mt-6 text-body text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link
          href="/sign-in"
          className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
