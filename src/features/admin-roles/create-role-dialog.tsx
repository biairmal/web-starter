"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
import type { Role } from "@/lib/api/types";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import {
  ROLE_DESCRIPTION_MAX,
  ROLE_NAME_MAX,
  useCreateRole,
} from "@/features/admin-roles/use-roles";

// "Create role" (FE-43, DESIGN_BRIEF 7.8): a name of 1 to 50 characters and
// an optional description. A name already used in the tenant shows on the
// field (DUPLICATE). The new role has no permissions, so the dialog opens its
// editor next.

type FormValues = { name: string; description: string };

function CreateRoleForm({
  onCreated,
  onCancel,
}: {
  onCreated: (role: Role) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("adminRoles.create");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const create = useCreateRole();
  const [message, setMessage] = useState<string | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, { error: t("nameRequired") })
          .max(ROLE_NAME_MAX, {
            error: t("nameTooLong", { max: ROLE_NAME_MAX }),
          }),
        description: z
          .string()
          .trim()
          .max(ROLE_DESCRIPTION_MAX, {
            error: t("descriptionTooLong", { max: ROLE_DESCRIPTION_MAX }),
          }),
      }),
    ),
    mode: "onTouched",
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    const name = values.name.trim();
    const description = values.description.trim();
    try {
      const role = await create.mutateAsync({
        name,
        ...(description ? { description } : {}),
      });
      onCreated(role);
    } catch (error) {
      const { applied } = applyServerErrors(
        form,
        ["name", "description"],
        error,
      );
      if (applied.length > 0) {
        return;
      }
      if (isApiError(error) && error.reason === "DUPLICATE") {
        form.setError(
          "name",
          { type: "server", message: t("duplicate") },
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
        description={t("nameHint", { max: ROLE_NAME_MAX })}
        render={(field) => <Input {...field} autoComplete="off" />}
      />
      <FormField
        control={form.control}
        name="description"
        label={t("description")}
        optional
        render={(field) => <Input {...field} autoComplete="off" />}
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

export function CreateRoleDialog() {
  const t = useTranslations("adminRoles.create");
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
          <CreateRoleForm
            onCreated={(role) => {
              setOpen(false);
              toast.success(t("created", { name: role.name }));
              router.push(`/admin/roles/${encodeURIComponent(role.id)}`);
            }}
            onCancel={() => {
              setOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
