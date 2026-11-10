"use client";

import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useMe } from "@/components/auth/session-provider";
import { useChangeLocale } from "@/components/layout/language-switcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { brand } from "@/config/brand";
import { locales } from "@/i18n/config";
import {
  type ThemePreference,
  applyThemePreference,
  isThemePreference,
  readThemePreference,
} from "@/lib/theme";

// The user row pinned to the bottom of the sidebar, and its menu: Account,
// Security, Language, Theme (APP_FLOW 2, DESIGN_BRIEF 5.2).

const THEMES: readonly ThemePreference[] = ["light", "dark", "system"];

/** Up to two initials from a display name, for the avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

export function UserMenu() {
  const t = useTranslations("userMenu");
  const tLanguage = useTranslations("common.language");
  const me = useMe();
  const { locale, changeLocale } = useChangeLocale();
  const [theme, setTheme] = useState<ThemePreference>(() =>
    typeof window === "undefined"
      ? brand.defaultTheme
      : readThemePreference(brand.defaultTheme),
  );

  const chooseTheme = (value: string) => {
    if (isThemePreference(value)) {
      setTheme(value);
      applyThemePreference(value);
    }
  };

  return (
    <DropdownMenu>
      {/* The accessible name keeps the visible name and role, then says what
          the button opens (WCAG 2.5.3 label in name). */}
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md p-2 text-start hover:bg-raised focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-active text-small font-medium"
        >
          {initials(me.display_name)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body font-medium">
            {me.display_name}
          </span>
          {me.roles[0] !== undefined && (
            <span className="truncate text-small text-muted-foreground">
              {me.roles[0]}
            </span>
          )}
        </span>
        <span className="sr-only">{t("open")}</span>
        <EllipsisVertical
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="truncate">
          {me.display_name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">{t("account")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/security">{t("security")}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{tLanguage("label")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
              {locales.map((option) => (
                <DropdownMenuRadioItem
                  key={option}
                  value={option}
                  lang={option}
                >
                  {tLanguage(`names.${option}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("theme")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={chooseTheme}>
              {THEMES.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {t(`themes.${option}`)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
