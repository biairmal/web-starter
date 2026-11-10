"use client";

import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/config/password-policy";
import { cn } from "@/lib/utils";

// The live password checklist (FE-4, DESIGN_BRIEF 6.1). Identity has no
// composition rules (TRD 12), so the rows are the length limits plus a static
// note about common passwords, which only the server can check. Rows never
// reorder or disappear; each flips from a dash to a check as it passes.

export type PasswordRule = { key: "min" | "max"; met: boolean };

export function passwordRules(
  value: string,
  min: number = PASSWORD_MIN_LENGTH,
  max: number = PASSWORD_MAX_LENGTH,
): PasswordRule[] {
  // Code points, not UTF-16 units, as identity counts characters.
  const length = Array.from(value).length;
  return [
    { key: "min", met: length >= min },
    { key: "max", met: length > 0 && length <= max },
  ];
}

export function PasswordRules({
  value,
  min = PASSWORD_MIN_LENGTH,
  max = PASSWORD_MAX_LENGTH,
  id,
  className,
}: {
  value: string;
  min?: number;
  max?: number;
  /** For `aria-describedby` on the password input. */
  id?: string;
  className?: string;
}) {
  const t = useTranslations("forms.password.rules");
  return (
    <ul id={id} className={cn("flex flex-col gap-1 text-small", className)}>
      {passwordRules(value, min, max).map((rule) => (
        <li
          key={rule.key}
          data-met={rule.met}
          className={cn(
            "flex items-center gap-1.5",
            rule.met ? "text-positive" : "text-faint",
          )}
        >
          {rule.met ? (
            <Check aria-hidden="true" className="size-3.5 shrink-0" />
          ) : (
            <Minus aria-hidden="true" className="size-3.5 shrink-0" />
          )}
          <span>{t(rule.key, { min, max })}</span>
          <span className="sr-only">{rule.met ? t("met") : t("notMet")}</span>
        </li>
      ))}
      <li className="flex items-center gap-1.5 text-faint">
        <Minus aria-hidden="true" className="invisible size-3.5 shrink-0" />
        <span>{t("common")}</span>
      </li>
    </ul>
  );
}
