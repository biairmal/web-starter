"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useMe } from "@/components/auth/session-provider";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/api/apply-server-errors";
import { useErrorText } from "@/lib/api/use-error-text";
import {
  type ProfileValues,
  useErrorToast,
  useUpdateProfile,
} from "@/features/account/use-me-mutations";

// The profile section of the account page (FE-32, DESIGN_BRIEF 7.6): the
// display name, and the email read-only with whether it is verified.

/** Identity's limit for `display_name` (BE TRD 9.5). */
const DISPLAY_NAME_MAX = 100;

export function ProfileForm() {
  const t = useTranslations("account.profile");
  const me = useMe();
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const emailId = useId();
  const [message, setMessage] = useState<string | undefined>();
  const update = useUpdateProfile();

  const form = useForm<ProfileValues>({
    resolver: zodResolver(
      z.object({
        display_name: z
          .string()
          .trim()
          .min(1, { error: t("nameRequired") })
          .max(DISPLAY_NAME_MAX, {
            error: t("nameTooLong", { max: DISPLAY_NAME_MAX }),
          }),
      }),
    ),
    mode: "onTouched",
    values: { display_name: me.display_name },
    resetOptions: { keepDirtyValues: true },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      const saved = await update.mutateAsync(values);
      form.reset({ display_name: saved.display_name });
      toast.success(t("saved"));
    } catch (error) {
      const { applied } = applyServerErrors(form, ["display_name"], error);
      if (applied.length > 0) {
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
      method="post"
      noValidate
      aria-labelledby="account-profile"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex flex-col gap-4"
    >
      <h2 id="account-profile" className="text-section font-semibold">
        {t("title")}
      </h2>
      <FormField
        control={form.control}
        name="display_name"
        label={t("name")}
        render={(field) => <Input {...field} autoComplete="name" />}
      />
      <div className="flex flex-col gap-2">
        <span id={emailId} className="text-body font-medium">
          {t("email")}
        </span>
        <div
          aria-labelledby={emailId}
          role="group"
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-body">{me.email}</span>
          {me.email_verified ? (
            <span className="rounded-sm bg-pill-positive px-2 py-0.5 text-small font-medium text-pill-positive-ink">
              {t("verified")}
            </span>
          ) : (
            <span className="rounded-sm bg-pill-warning px-2 py-0.5 text-small font-medium text-pill-warning-ink">
              {t("unverified")}
            </span>
          )}
        </div>
        <p className="text-small text-muted-foreground">{t("emailHint")}</p>
      </div>
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
          {t("save")}
        </SubmitButton>
      </div>
    </form>
  );
}
