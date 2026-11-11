"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { brand } from "@/config/brand";
import { applyServerErrors } from "@/lib/api/apply-server-errors";
import { bffPost } from "@/lib/api/bff-fetch";
import type { LoginResult } from "@/lib/api/bff-types";
import { isApiError } from "@/lib/api/errors";
import type { AuthConfig } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { hardNavigate } from "@/lib/hard-navigate";
import {
  AuthHeading,
  FullPageNotice,
  InlineNotice,
  useErrorToast,
} from "@/features/auth/auth-screen";
import {
  clearPendingSignIn,
  recallSignIn,
  setPendingSignIn,
} from "@/features/auth/pending-sign-in";
import { GoogleButton } from "@/features/auth/google-button";
import { ReasonBanner } from "@/features/auth/reason-banner";
import { ResendButton } from "@/features/auth/resend-button";
import { useAuthConfig } from "@/features/auth/use-auth-config";
import { useCountdown } from "@/features/auth/use-countdown";

// The sign-in screen (FE-1, FE-2, FE-8, FE-10; APP_FLOW 5.1, 5.2; DESIGN_BRIEF
// 7.1). Only the methods identity enables render. Errors follow TRD 10.

export const TENANT_PICKER_PATH = "/sign-in/tenant";

type Values = { email: string; password: string };
const FIELDS = ["email", "password"] as const;

/** Treatments the form shows itself, after a failed sign-in. */
type Failure =
  | { kind: "form"; text: string }
  | { kind: "notice"; text: string }
  | { kind: "blocked"; text: string };

export function SignInForm({
  next,
  reason,
  initialConfig,
  initialTenant,
}: {
  next: string;
  reason?: string | undefined;
  initialConfig: AuthConfig | null;
  /** The workspace slug to keep after Google answered TENANT_REQUIRED. */
  initialTenant?: string | undefined;
}) {
  const t = useTranslations("auth.signIn");
  const router = useRouter();
  const config = useAuthConfig(initialConfig);
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const wait = useCountdown();
  const [failure, setFailure] = useState<Failure | null>(null);

  const schema = z.object({
    email: z
      .string()
      .trim()
      .pipe(z.email({ error: t("emailInvalid") })),
    password: z.string().min(1, { error: t("passwordRequired") }),
  });
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  // Back from a tenant picker that lost its state on reload: keep the email.
  useEffect(() => {
    const remembered = recallSignIn();
    if (remembered) {
      form.setValue("email", remembered.email);
    }
  }, [form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFailure(null);
    try {
      const result = await bffPost<LoginResult>("/api/auth/login", {
        email: values.email,
        password: values.password,
        next,
      });
      if ("tenant_required" in result) {
        setPendingSignIn({
          email: values.email,
          password: values.password,
          tenants: result.tenants,
          next,
        });
        router.push(TENANT_PICKER_PATH);
        return;
      }
      clearPendingSignIn();
      hardNavigate(result.next);
      // Keep the button busy until the page goes.
      await new Promise(() => undefined);
    } catch (error) {
      handleError(error);
    }
  });

  function handleError(error: unknown) {
    if (isApiError(error) && Object.keys(error.fields).length > 0) {
      const { applied } = applyServerErrors(form, FIELDS, error);
      if (applied.length > 0) {
        return;
      }
    }
    const described = errorText(error);
    if (isApiError(error) && error.retryAfter !== undefined) {
      wait.start(error.retryAfter);
    }
    switch (described.treatment) {
      case "notice":
        setFailure({ kind: "notice", text: described.text });
        return;
      case "fullPage":
        setFailure({ kind: "blocked", text: described.text });
        return;
      case "toast":
        if (isApiError(error) && error.reason === "RATE_LIMITED") {
          setFailure({ kind: "form", text: described.text });
        }
        errorToast(described);
        return;
      default:
        setFailure({ kind: "form", text: described.text });
    }
  }

  if (failure?.kind === "blocked") {
    return (
      <FullPageNotice
        title={t("blockedTitle")}
        message={failure.text}
        onBack={() => {
          setFailure(null);
        }}
      />
    );
  }

  const errorCount =
    form.formState.submitCount > 0
      ? Object.keys(form.formState.errors).length
      : 0;

  return (
    <div className="flex flex-col">
      <ReasonBanner reason={reason} className="mb-6" />
      <AuthHeading title={t("title", { appName: brand.appName })} />

      {config.providers.password && (
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
            name="email"
            label={t("email")}
            render={(field) => (
              <Input
                {...field}
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
          />
          <div className="relative">
            <FormField
              control={form.control}
              name="password"
              label={t("password")}
              render={(field) => (
                <PasswordInput {...field} autoComplete="current-password" />
              )}
            />
            <Link
              href="/forgot-password"
              className="absolute end-0 top-0 rounded-sm text-body text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {t("forgot")}
            </Link>
          </div>

          {failure?.kind === "notice" && (
            <InlineNotice
              action={
                <ResendButton
                  email={form.getValues("email").trim()}
                  variant="link"
                  className="h-auto self-start p-0"
                />
              }
            >
              {failure.text}
            </InlineNotice>
          )}
          <FormErrorSummary
            invalidCount={errorCount}
            message={failure?.kind === "form" ? failure.text : undefined}
          />

          {wait.remaining > 0 ? (
            <Button type="button" size="lg" disabled className="w-full">
              {t("retryIn", { seconds: wait.remaining })}
            </Button>
          ) : (
            <SubmitButton
              size="lg"
              pending={form.formState.isSubmitting}
              className="w-full"
            >
              {t("submit")}
            </SubmitButton>
          )}
        </form>
      )}

      {config.providers.google && (
        <>
          {config.providers.password && (
            <div className="my-6 flex items-center gap-3 text-small text-faint">
              <Separator className="flex-1" />
              <span>{t("or")}</span>
              <Separator className="flex-1" />
            </div>
          )}
          <GoogleButton
            next={next}
            multi={config.tenancy === "multi"}
            initialTenant={initialTenant}
          />
        </>
      )}

      {!config.providers.password && !config.providers.google && (
        <p role="alert" className="text-body text-muted-foreground">
          {t("noMethods", { supportEmail: brand.supportEmail })}
        </p>
      )}

      {config.registration && (
        <p className="mt-6 text-body text-muted-foreground">
          {t("noAccount")}{" "}
          <Link
            href="/sign-up"
            className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t("createAccount")}
          </Link>
        </p>
      )}
    </div>
  );
}
