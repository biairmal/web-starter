"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { bffPost } from "@/lib/api/bff-fetch";
import { useErrorText } from "@/lib/api/use-error-text";
import { AuthHeading } from "@/features/auth/auth-screen";

// /forgot-password (FE-6, APP_FLOW 5.5, DESIGN_BRIEF 7.3). The confirmation is
// the same whether or not the address has an account.

type Values = { email: string };

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const errorText = useErrorText();
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const form = useForm<Values>({
    resolver: zodResolver(
      z.object({
        email: z
          .string()
          .trim()
          .pipe(z.email({ error: t("emailInvalid") })),
      }),
    ),
    mode: "onTouched",
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      await bffPost("/api/auth/password/forgot", { email: values.email });
      setSent(true);
    } catch (error) {
      setMessage(errorText(error).text);
    }
  });

  const back = (
    <p className="mt-6 text-body">
      <Link
        href="/sign-in"
        className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {t("back")}
      </Link>
    </p>
  );

  if (sent) {
    return (
      <div className="flex flex-col">
        <AuthHeading title={t("sentTitle")} body={t("sentBody")} />
        {back}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AuthHeading title={t("title")} body={t("body")} />
      <form
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        className="flex flex-col gap-4"
      >
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
      {back}
    </div>
  );
}
