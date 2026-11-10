"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import {
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  useController,
} from "react-hook-form";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

// One labelled form field bound to React Hook Form (DESIGN_BRIEF 6.1): label
// above, optional description, the error under the field with an icon, and
// `aria-invalid` / `aria-describedby` wired to both.

export type FieldControlProps<
  T extends FieldValues,
  N extends FieldPath<T>,
> = ControllerRenderProps<T, N> & {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
  "aria-required": boolean | undefined;
};

export function FormField<T extends FieldValues, N extends FieldPath<T>>({
  control,
  name,
  label,
  description,
  required = false,
  optional = false,
  className,
  render,
}: {
  control: Control<T>;
  name: N;
  label: React.ReactNode;
  description?: React.ReactNode;
  /** Marks the label with `*`. Use either `required` or `optional` per form. */
  required?: boolean;
  /** Adds "(optional)" to the label. */
  optional?: boolean;
  className?: string;
  render: (props: FieldControlProps<T, N>) => React.ReactNode;
}) {
  const t = useTranslations("forms");
  const id = useId();
  const { field, fieldState } = useController({ control, name });
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = fieldState.error ? `${id}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={fieldState.invalid || undefined} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-muted-foreground">
            {t("requiredMark")}
          </span>
        )}
        {optional && (
          <span className="font-normal text-muted-foreground">
            {t("optional")}
          </span>
        )}
      </FieldLabel>
      {render({
        ...field,
        id,
        "aria-invalid": fieldState.invalid,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {fieldState.error?.message && (
        <p
          id={errorId}
          className="flex items-center gap-1 text-small text-negative"
        >
          <AlertCircle aria-hidden="true" className="size-3 shrink-0" />
          {fieldState.error.message}
        </p>
      )}
    </Field>
  );
}

/**
 * The form-level error above the submit button, and a polite announcement of
 * how many fields need attention after a failed submit (DESIGN_BRIEF 6.1).
 */
export function FormErrorSummary({
  invalidCount,
  message,
  className,
}: {
  invalidCount: number;
  message?: string | undefined;
  className?: string;
}) {
  const t = useTranslations("forms");
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p role="status" aria-live="polite" className="sr-only">
        {invalidCount > 0 ? t("invalidCount", { count: invalidCount }) : ""}
      </p>
      {message && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-body text-negative"
        >
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
