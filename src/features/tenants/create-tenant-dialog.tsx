"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormErrorSummary, FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
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
import {
  NEW_TENANT_SLUG_PATTERN,
  type NewTenant,
  TENANT_SLUG_MAX,
  slugFromName,
  tenantPath,
  useCreateTenant,
} from "@/features/tenants/use-tenants";

// The create-tenant dialog (FE-50; APP_FLOW 5.15; DESIGN_BRIEF 7.10): name,
// slug and the first admin's email. The slug follows the name until the user
// edits it, and its pattern is checked as it changes. A taken slug shows on
// the slug field. Success opens the new tenant with "Invite sent".

/** Identity's limit for a tenant name. */
const NAME_MAX = 100;

type FormValues = NewTenant;

const EMPTY: FormValues = { name: "", slug: "", first_admin_email: "" };

function CreateTenantForm({
  onCreated,
  onCancel,
}: {
  onCreated: (tenantId: string, email: string) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("tenants.create");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const create = useCreateTenant();
  const [message, setMessage] = useState<string | undefined>();
  // The slug follows the name until the user types in it.
  const slugEdited = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, { error: t("nameRequired") })
          .max(NAME_MAX, { error: t("nameTooLong", { max: NAME_MAX }) }),
        slug: z
          .string()
          .trim()
          .min(1, { error: t("slugRequired") })
          .max(TENANT_SLUG_MAX, {
            error: t("slugTooLong", { max: TENANT_SLUG_MAX }),
          })
          .regex(NEW_TENANT_SLUG_PATTERN, { error: t("slugInvalid") }),
        first_admin_email: z
          .string()
          .trim()
          .min(1, { error: t("emailRequired") })
          .pipe(z.email({ error: t("emailInvalid") })),
      }),
    ),
    mode: "onTouched",
    defaultValues: EMPTY,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    const request: NewTenant = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      first_admin_email: values.first_admin_email.trim(),
    };
    try {
      const tenant = await create.mutateAsync(request);
      onCreated(tenant.id, request.first_admin_email);
    } catch (error) {
      if (isApiError(error) && error.reason === "DUPLICATE") {
        form.setError(
          "slug",
          { type: "server", message: t("slugTaken") },
          { shouldFocus: true },
        );
        return;
      }
      const { applied } = applyServerErrors(
        form,
        ["name", "slug", "first_admin_email"],
        error,
      );
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
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
    >
      <FormField
        control={form.control}
        name="name"
        label={t("name")}
        required
        render={(field) => (
          <Input
            {...field}
            autoComplete="off"
            onChange={(event) => {
              field.onChange(event);
              if (!slugEdited.current) {
                form.setValue("slug", slugFromName(event.target.value), {
                  shouldValidate: form.getFieldState("slug").isTouched,
                });
              }
            }}
          />
        )}
      />
      <FormField
        control={form.control}
        name="slug"
        label={t("slug")}
        description={t("slugHint")}
        required
        render={(field) => (
          <Input
            {...field}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="none"
            className="font-mono"
            onChange={(event) => {
              slugEdited.current = true;
              field.onChange(event);
              void form.trigger("slug");
            }}
          />
        )}
      />
      <FormField
        control={form.control}
        name="first_admin_email"
        label={t("email")}
        description={t("emailHint")}
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

/** "Create tenant" and its dialog. */
export function CreateTenantDialog() {
  const t = useTranslations("tenants.create");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onCreated = (tenantId: string, email: string) => {
    setOpen(false);
    toast.success(t("created", { email }));
    router.push(tenantPath({ id: tenantId }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Plus aria-hidden="true" />
        {t("open")}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts empty. */}
        {open && (
          <CreateTenantForm
            onCreated={onCreated}
            onCancel={() => {
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
