import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { isApiError } from "@/lib/api/errors";

// Puts `meta.fields` from an error response onto React Hook Form fields
// (TRD 10: PASSWORD_POLICY, DUPLICATE, ALREADY_MEMBER).

export type ApplyServerErrorsOptions<T extends FieldValues> = {
  /**
   * Maps a JSON field name from the server to a form field, for forms whose
   * names differ (`new_password` → `newPassword`). Unmapped names are used as
   * they are when the form has such a field.
   */
  fieldMap?: Partial<Record<string, Path<T>>>;
  /** Replaces the server's message, for example with a translated one. */
  message?: (field: Path<T>, serverMessage: string) => string;
};

export type ApplyServerErrorsResult<T extends FieldValues> = {
  /** Form fields that received an error, in the server's order. */
  applied: Path<T>[];
  /** Server field errors that match no form field: show them at form level. */
  unmatched: Record<string, string>;
};

/**
 * Sets one error per field the server named and focuses the first. `fields`
 * lists the form's field names, so a server name that is not on the form is
 * returned as unmatched instead of being set on a field nobody sees.
 */
export function applyServerErrors<T extends FieldValues>(
  form: { setError: UseFormSetError<T> },
  fields: readonly Path<T>[],
  error: unknown,
  options: ApplyServerErrorsOptions<T> = {},
): ApplyServerErrorsResult<T> {
  const result: ApplyServerErrorsResult<T> = { applied: [], unmatched: {} };
  if (!isApiError(error)) {
    return result;
  }
  const known = new Set<string>(fields);
  for (const [serverName, serverMessage] of Object.entries(error.fields)) {
    const mapped = options.fieldMap?.[serverName];
    const name =
      mapped ?? (known.has(serverName) ? (serverName as Path<T>) : undefined);
    if (name === undefined) {
      result.unmatched[serverName] = serverMessage;
      continue;
    }
    form.setError(
      name,
      {
        type: "server",
        message: options.message?.(name, serverMessage) ?? serverMessage,
      },
      { shouldFocus: result.applied.length === 0 },
    );
    result.applied.push(name);
  }
  return result;
}
