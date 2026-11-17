"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "@/components/feedback/toast";
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
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/api/apply-server-errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { useErrorToast } from "@/lib/api/use-error-toast";
import { NOTE_TITLE_MAX, useCreateNote } from "@/features/notes/use-notes";

// "New note": a title of 1 to 200 characters and an optional body. Field
// errors from the service (`meta.fields`) show on their inputs.

type FormValues = { title: string; body: string };

function CreateNoteForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("notes.create");
  const errorText = useErrorText();
  const errorToast = useErrorToast();
  const create = useCreateNote();
  const [message, setMessage] = useState<string | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        title: z
          .string()
          .trim()
          .min(1, { error: t("titleRequired") })
          .max(NOTE_TITLE_MAX, {
            error: t("titleTooLong", { max: NOTE_TITLE_MAX }),
          }),
        body: z.string(),
      }),
    ),
    mode: "onTouched",
    defaultValues: { title: "", body: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage(undefined);
    const body = values.body.trim();
    try {
      await create.mutateAsync({
        title: values.title.trim(),
        status: "draft",
        ...(body ? { body } : {}),
      });
      onCreated();
    } catch (error) {
      const { applied } = applyServerErrors(form, ["title", "body"], error);
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
        name="title"
        label={t("title")}
        required
        counter={NOTE_TITLE_MAX}
        render={(field) => <Input {...field} autoComplete="off" />}
      />
      <FormField
        control={form.control}
        name="body"
        label={t("body")}
        optional
        render={(field) => <Textarea {...field} rows={4} />}
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

export function CreateNoteDialog() {
  const t = useTranslations("notes.create");
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
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogBody")}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so every opening starts empty. */}
        {open && (
          <CreateNoteForm
            onCreated={() => {
              setOpen(false);
              toast.success(t("created"));
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
