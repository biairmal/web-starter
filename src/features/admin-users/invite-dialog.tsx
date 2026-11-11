"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ErrorState } from "@/components/feedback/error-state";
import { SkeletonBar } from "@/components/feedback/page-skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/api/apply-server-errors";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { RoleChecklist } from "@/features/admin-users/role-checklist";
import {
  type InviteValues,
  useInviteUser,
  useRoleOptions,
} from "@/features/admin-users/use-users";

// The invite dialog (FE-41, APP_FLOW 5.11, DESIGN_BRIEF 7.7): email, an
// optional name and at least one role. Success closes the dialog and toasts
// "Invite sent" with Resend for 10 seconds. An existing member is reported on
// the email field.

/** Identity's limit for `display_name` (BE TRD 9.6). */
const DISPLAY_NAME_MAX = 100;
/** How long the success toast offers Resend (DESIGN_BRIEF 7.7). */
const RESEND_WINDOW_MS = 10_000;

type FormValues = { email: string; display_name: string; role_ids: string[] };

const EMPTY: FormValues = { email: "", display_name: "", role_ids: [] };

function toRequest(values: FormValues): InviteValues {
  const name = values.display_name.trim();
  return {
    email: values.email.trim(),
    role_ids: values.role_ids,
    ...(name ? { display_name: name } : {}),
  };
}

function InviteForm({
  onSent,
  onCancel,
}: {
  onSent: (request: InviteValues) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("adminUsers.invite");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const rolesErrorId = useId();
  const roles = useRoleOptions();
  const invite = useInviteUser();
  const [message, setMessage] = useState<string | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        email: z
          .string()
          .trim()
          .min(1, { error: t("emailRequired") })
          .pipe(z.email({ error: t("emailInvalid") })),
        display_name: z
          .string()
          .trim()
          .max(DISPLAY_NAME_MAX, {
            error: t("nameTooLong", { max: DISPLAY_NAME_MAX }),
          }),
        role_ids: z.array(z.string()).min(1, { error: t("rolesRequired") }),
      }),
    ),
    mode: "onTouched",
    defaultValues: EMPTY,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    const request = toRequest(values);
    try {
      await invite.mutateAsync(request);
      onSent(request);
    } catch (error) {
      const { applied } = applyServerErrors(
        form,
        ["email", "display_name", "role_ids"],
        error,
      );
      if (applied.length > 0) {
        return;
      }
      if (
        isApiError(error) &&
        (error.reason === "ALREADY_MEMBER" || error.reason === "DUPLICATE")
      ) {
        form.setError(
          "email",
          { type: "server", message: t("alreadyMember") },
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

  const rolesError = form.formState.errors.role_ids?.message;

  return (
    <form
      method="post"
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <FormField
        control={form.control}
        name="email"
        label={t("email")}
        required
        render={(field) => (
          <Input
            {...field}
            type="email"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      />
      <FormField
        control={form.control}
        name="display_name"
        label={t("name")}
        optional
        render={(field) => <Input {...field} autoComplete="off" />}
      />
      {roles.isPending ? (
        <div role="status" className="flex flex-col gap-2">
          <span className="sr-only">{t("rolesLoading")}</span>
          <SkeletonBar className="w-24" />
          <SkeletonBar className="h-24 w-full" />
        </div>
      ) : roles.isError ? (
        isApiError(roles.error) && roles.error.status === 403 ? (
          <p role="alert" className="text-body text-negative">
            {t("rolesForbidden")}
          </p>
        ) : (
          <ErrorState
            className="py-2"
            title={t("rolesFailed")}
            error={roles.error}
            retrying={roles.isFetching}
            onRetry={() => {
              void roles.refetch();
            }}
          />
        )
      ) : (
        <Controller
          control={form.control}
          name="role_ids"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <RoleChecklist
                legend={t("roles")}
                roles={roles.data.items}
                value={field.value}
                onChange={(ids) => {
                  field.onChange(ids);
                  field.onBlur();
                }}
                invalid={rolesError !== undefined}
                describedBy={rolesError ? rolesErrorId : undefined}
              />
              {rolesError && (
                <p id={rolesErrorId} className="text-small text-negative">
                  {rolesError}
                </p>
              )}
            </div>
          )}
        />
      )}
      <FormErrorSummary
        invalidCount={
          form.formState.submitCount > 0
            ? Object.keys(form.formState.errors).length
            : 0
        }
        message={message}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <SubmitButton pending={form.formState.isSubmitting}>
          {t("submit")}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** "Invite user" and its dialog. Render it only for holders of `users:manage`. */
export function InviteDialog() {
  const t = useTranslations("adminUsers.invite");
  const [open, setOpen] = useState(false);
  const errorToast = useErrorToast();
  // Resend outlives the form, which unmounts when the dialog closes.
  const resend = useInviteUser();

  const onSent = (request: InviteValues) => {
    setOpen(false);
    toast.success(t("sent", { email: request.email }), {
      duration: RESEND_WINDOW_MS,
      action: {
        label: t("resend"),
        onClick: () => {
          resend.mutate(request, {
            onSuccess: () => {
              toast.success(t("resent", { email: request.email }));
            },
            onError: errorToast,
          });
        },
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        <UserPlus aria-hidden="true" />
        {t("open")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts empty. */}
        {open && (
          <InviteForm
            onSent={onSent}
            onCancel={() => {
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
