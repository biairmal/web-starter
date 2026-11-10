"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocale } from "@/i18n/actions";
import { type AppLocale, isLocale, locales } from "@/i18n/config";

/**
 * Changes the UI language: stores it in the locale cookie, then re-renders the
 * current route on the server so every string switches at once.
 */
export function useChangeLocale(): {
  locale: AppLocale;
  changeLocale: (next: string) => void;
  pending: boolean;
} {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const changeLocale = (next: string) => {
    if (!isLocale(next) || next === current) {
      return;
    }
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };
  return {
    locale: isLocale(current) ? current : locales[0],
    changeLocale,
    pending,
  };
}

export function LanguageSwitcher() {
  const t = useTranslations("common.language");
  const id = useId();
  const { locale, changeLocale, pending } = useChangeLocale();
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id}>{t("label")}</Label>
      <Select value={locale} onValueChange={changeLocale} disabled={pending}>
        <SelectTrigger id={id} size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {locales.map((option) => (
            <SelectItem key={option} value={option} lang={option}>
              {t(`names.${option}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
